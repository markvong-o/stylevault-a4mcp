#!/usr/bin/env tsx
/**
 * Setup script for Google UCP integration.
 *
 * Provisions Auth0 resources (API, Identity Linking app with CIBA, user, Action),
 * initializes SQLite databases, seeds product catalog, and generates .env.
 *
 * Usage: npm run setup:ucp
 */

import {
  getManagementToken,
  createResourceServer,
  createClient,
  createClientGrant,
  createUser,
  createAction,
  deployAction,
  updateClient,
} from "../src/setup/auth0-api.js";
import { writeEnv, readEnv, mergeEnv, envPath } from "../src/setup/env-writer.js";
import { initProductsDb, initTransactionsDb, getDataDir } from "../src/setup/db-init.js";
import { seedProducts, getDbStats } from "../src/setup/db-seed.js";
import { banner, step, done, info, warn, fail, spin, ask, askPassword, confirm, summaryBox, c } from "../src/setup/ui.js";

// ── Constants ───────────────────────────────────────────────

const API_NAME = "RetailZero MCP API";
const API_IDENTIFIER = "https://api.stylevault.com";
const UCP_APP_NAME = "RetailZero UCP Identity Linking";
const TEST_USER_EMAIL = "alex@example.com";
const TEST_USER_PASSWORD = "Demo-Pass-2026!";
const DB_CONNECTION = "Username-Password-Authentication";

const SCOPES = [
  { value: "read:products", description: "Search and view product catalog" },
  { value: "read:wishlist", description: "View saved wishlist items" },
  { value: "read:orders", description: "View order history" },
  { value: "write:preferences", description: "Update style preferences" },
  { value: "execute:purchase", description: "Place orders (bounded to agent limit)" },
];

const BOUNDED_AUTHORITY_ACTION_CODE = `
exports.onExecutePostLogin = async (event, api) => {
  const namespace = "https://api.stylevault.com";
  api.accessToken.setCustomClaim(\`\${namespace}/max_purchase_amount\`, 250);
  api.accessToken.setCustomClaim(\`\${namespace}/currency\`, "USD");
};
`.trim();

// ── Main ────────────────────────────────────────────────────

async function main() {
  banner(
    "RetailZero -- Google UCP Setup",
    "This script provisions Auth0 (with CIBA), initializes the database, and generates your .env."
  );

  // Check for existing config
  const existing = readEnv();
  let domain = existing.AUTH0_DOMAIN;
  let m2mClientId: string;
  let m2mClientSecret: string;
  let token: string;
  let reusingAuth0 = false;

  if (domain && domain !== "your-tenant.us.auth0.com") {
    info(`Existing .env found with AUTH0_DOMAIN = ${c.key(domain)}`);
    const reuse = await confirm("Reuse existing Auth0 credentials?", true);

    if (reuse) {
      reusingAuth0 = true;
      // We still need M2M creds for Management API calls
      info("The UCP setup needs Management API access to create the Identity Linking app.");
    }
  }

  // ── Step 1: Auth0 M2M credentials ────────────────────────

  step(1, "Auth0 Management API Credentials");

  if (!reusingAuth0) {
    console.log();
    info("You need an M2M application with Management API access.");
    info(`Create one at: ${c.url("https://manage.auth0.com/#/applications")}`);
    info("Grant it these Management API scopes:");
    info("  create:resource_servers, create:clients, create:client_grants,");
    info("  create:users, create:actions, update:actions, update:clients");
    console.log();

    domain = await ask("Auth0 domain (e.g. stylevault.us.auth0.com):");
  } else {
    info(`Using domain: ${c.key(domain!)}`);
  }

  m2mClientId = await ask("M2M Client ID:");
  m2mClientSecret = await askPassword("M2M Client Secret:");

  const credSpinner = spin("Validating credentials...");
  try {
    token = await getManagementToken(domain!, m2mClientId, m2mClientSecret);
    credSpinner.succeed("  Credentials validated");
  } catch (err) {
    credSpinner.fail("  Invalid credentials");
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 2: Create Auth0 API (idempotent) ─────────────────

  step(2, "Auth0 API (Resource Server)");
  const apiSpinner = spin(`Ensuring API exists: ${API_IDENTIFIER}...`);
  try {
    await createResourceServer(token, domain!, {
      name: API_NAME,
      identifier: API_IDENTIFIER,
      scopes: SCOPES,
    });
    apiSpinner.succeed(`  API ready: ${c.key(API_IDENTIFIER)}`);
  } catch (err) {
    apiSpinner.fail("  Failed to create API");
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 3: Create UCP Identity Linking App ───────────────

  step(3, "UCP Identity Linking Application (with CIBA)");
  const appSpinner = spin(`Creating application: ${UCP_APP_NAME}...`);
  let ucpClientId: string;
  let ucpClientSecret: string;

  try {
    const app = await createClient(token, domain!, {
      name: UCP_APP_NAME,
      app_type: "regular_web",
      grant_types: [
        "authorization_code",
        "client_credentials",
        "urn:openid:params:grant-type:ciba",
      ],
    });
    ucpClientId = app.client_id as string;
    ucpClientSecret = app.client_secret as string;
    appSpinner.succeed(`  Application created: ${c.key(UCP_APP_NAME)}`);

    // Enable CIBA on this application
    const cibaSpinner = spin("Enabling CIBA grant type...");
    try {
      await updateClient(token, domain!, ucpClientId, {
        grant_types: [
          "authorization_code",
          "client_credentials",
          "urn:openid:params:grant-type:ciba",
        ],
      });
      cibaSpinner.succeed("  CIBA enabled on application");
    } catch (err) {
      cibaSpinner.fail("  Failed to enable CIBA");
      warn((err as Error).message);
      warn("You may need to enable CIBA manually in the Auth0 Dashboard.");
      warn("CIBA requires an Enterprise plan or specific feature flag.");
    }
  } catch (err) {
    appSpinner.fail("  Failed to create application");
    fail((err as Error).message);
    process.exit(1);
  }

  // Create client grant
  const grantSpinner = spin("Authorizing app for API...");
  try {
    await createClientGrant(token, domain!, {
      client_id: ucpClientId,
      audience: API_IDENTIFIER,
      scope: SCOPES.map((s) => s.value),
    });
    grantSpinner.succeed("  Client grant created");
  } catch (err) {
    grantSpinner.fail("  Failed to create client grant");
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 4: Create Test User (idempotent) ─────────────────

  step(4, "Test User");
  const userSpinner = spin(`Ensuring user exists: ${TEST_USER_EMAIL}...`);
  try {
    await createUser(token, domain!, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      connection: DB_CONNECTION,
    });
    userSpinner.succeed(`  User ready: ${c.key(TEST_USER_EMAIL)}`);
  } catch (err) {
    userSpinner.fail("  Failed to create user");
    warn((err as Error).message);
    warn("Continuing -- user may already exist.");
  }

  // ── Step 5: Create Bounded Authority Action (idempotent) ──

  step(5, "Bounded Authority Action");
  const actionSpinner = spin("Creating post-login Action...");
  try {
    const action = await createAction(token, domain!, {
      name: "RetailZero Bounded Authority",
      code: BOUNDED_AUTHORITY_ACTION_CODE,
      supported_triggers: [{ id: "post-login", version: "v3" }],
    });

    const actionId = action.id as string;
    actionSpinner.text = "  Deploying Action...";
    await deployAction(token, domain!, actionId);
    actionSpinner.succeed("  Action created and deployed");
    warn("Remember to add this Action to your Login Flow in the Auth0 Dashboard.");
  } catch (err) {
    actionSpinner.fail("  Failed to create Action");
    warn((err as Error).message);
    warn("Continuing -- Action may already exist or you can create it manually.");
  }

  // ── Step 6: Initialize Databases ──────────────────────────

  step(6, "SQLite Databases");
  const dbSpinner = spin("Initializing databases...");
  try {
    const productsDb = initProductsDb();
    const transactionsDb = initTransactionsDb();

    dbSpinner.text = "  Seeding product catalog...";
    const inserted = seedProducts(productsDb);
    const stats = getDbStats(productsDb);

    productsDb.close();
    transactionsDb.close();

    dbSpinner.succeed("  Databases initialized");
    done(`Products: ${stats.products} (${inserted} newly inserted)`);
    done(`Inventory items: ${stats.inventoryItems}`);
    done(`Data directory: ${c.dim(getDataDir())}`);
  } catch (err) {
    dbSpinner.fail("  Database initialization failed");
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 7: Generate .env ─────────────────────────────────

  step(7, "Environment File");

  if (reusingAuth0) {
    // Merge UCP-specific vars into existing .env
    mergeEnv([
      { key: "AUTH0_UCP_CLIENT_ID", value: ucpClientId, comment: "UCP Identity Linking application" },
      { key: "AUTH0_UCP_CLIENT_SECRET", value: ucpClientSecret },
      { key: "CIBA_ENABLED", value: "true", comment: "Client-Initiated Backchannel Authentication" },
      { key: "DATABASE_PATH", value: "./data", comment: "SQLite database directory" },
    ]);
    done(`UCP variables merged into ${c.dim(envPath())}`);
  } else {
    writeEnv([
      {
        header: "Auth0 Configuration",
        entries: [
          { key: "AUTH0_DOMAIN", value: domain! },
          { key: "AUTH0_AUDIENCE", value: API_IDENTIFIER },
        ],
      },
      {
        header: "Auth0 UCP (Identity Linking + CIBA)",
        entries: [
          { key: "AUTH0_UCP_CLIENT_ID", value: ucpClientId },
          { key: "AUTH0_UCP_CLIENT_SECRET", value: ucpClientSecret },
          { key: "CIBA_ENABLED", value: "true" },
        ],
      },
      {
        header: "Database",
        entries: [
          { key: "DATABASE_PATH", value: "./data" },
        ],
      },
      {
        header: "Server",
        entries: [
          { key: "PORT", value: "3001" },
        ],
      },
    ]);
    done(`.env written to ${c.dim(envPath())}`);
  }

  // ── Done ──────────────────────────────────────────────────

  summaryBox("Setup Complete", [
    ["Auth0 Domain", domain!],
    ["API", API_IDENTIFIER],
    ["UCP App", `${UCP_APP_NAME} (${ucpClientId})`],
    ["CIBA", "Enabled"],
    ["Test User", `${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`],
    ["Products DB", `${getDataDir()}/products.db`],
    ["Transactions DB", `${getDataDir()}/transactions.db`],
    [".env", envPath()],
  ]);

  console.log(c.title("  Next Steps:"));
  console.log();
  info("1. Add the Action to your Login Flow:");
  info(`   ${c.url(`https://manage.auth0.com/dashboard/us/${domain!.split(".")[0]}/actions/flows/login`)}`);
  console.log();
  info("2. Set up Auth0 Guardian for CIBA push notifications:");
  info(`   ${c.url(`https://manage.auth0.com/dashboard/us/${domain!.split(".")[0]}/guardian`)}`);
  console.log();
  info("3. Start the server:");
  info(`   ${c.dim("npm run dev")}`);
  console.log();
  info("4. Run conformance tests:");
  info(`   ${c.dim("git clone https://github.com/universal-commerce-protocol/conformance.git")}`);
  info(`   ${c.dim("cd conformance && uv run pytest -v --server-url=http://localhost:3001")}`);
  console.log();
  info("5. Deploy and register with Google Merchant Center:");
  info(`   ${c.url("https://merchants.google.com")}`);
  console.log();
}

main().catch((err) => {
  fail(`Setup failed: ${err.message}`);
  process.exit(1);
});
