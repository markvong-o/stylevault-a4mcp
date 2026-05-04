#!/usr/bin/env tsx
/**
 * Setup script for ChatGPT MCP integration.
 *
 * Provisions Auth0 resources (API, app, user, Action),
 * generates .env, and optionally starts a tunnel.
 *
 * Usage: npm run setup:chatgpt
 */

import {
  getManagementToken,
  createResourceServer,
  createClient,
  createClientGrant,
  createUser,
  createAction,
  deployAction,
} from "../src/setup/auth0-api.js";
import { writeEnv, readEnv, envPath } from "../src/setup/env-writer.js";
import { banner, step, done, info, warn, fail, spin, ask, askPassword, confirm, summaryBox, c } from "../src/setup/ui.js";

// ── Constants ───────────────────────────────────────────────

const API_NAME = "RetailZero MCP API";
const API_IDENTIFIER = "https://app.retailzero.mvbuilt.com/api";
const APP_NAME = "RetailZero MCP Server";
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
  // Add bounded authority claim to access tokens.
  // In production, this would come from a database or policy engine.
  const namespace = "https://app.retailzero.mvbuilt.com/api";
  api.accessToken.setCustomClaim(\`\${namespace}/max_purchase_amount\`, 250);
  api.accessToken.setCustomClaim(\`\${namespace}/currency\`, "USD");
};
`.trim();

// ── Main ────────────────────────────────────────────────────

async function main() {
  banner(
    "RetailZero -- ChatGPT MCP Setup",
    "This script provisions Auth0 and generates your .env so the MCP server works with ChatGPT."
  );

  // Check for existing config
  const existing = readEnv();
  if (existing.AUTH0_DOMAIN && existing.AUTH0_DOMAIN !== "your-tenant.us.auth0.com") {
    info(`Existing .env found at ${c.dim(envPath())}`);
    info(`AUTH0_DOMAIN = ${c.key(existing.AUTH0_DOMAIN)}`);
    const reuse = await confirm("Auth0 credentials already configured. Re-run setup anyway?", false);
    if (!reuse) {
      done("Using existing configuration. Nothing to do.");
      return;
    }
  }

  // ── Step 1: Collect Auth0 M2M credentials ─────────────────

  step(1, "Auth0 Management API Credentials");
  console.log();
  info("You need an M2M application with Management API access.");
  info(`Create one at: ${c.url("https://manage.auth0.com/#/applications")}`);
  info("Grant it these Management API scopes:");
  info("  create:resource_servers, create:clients, create:client_grants,");
  info("  create:users, create:actions, update:actions");
  console.log();

  const domain = await ask("Auth0 domain (e.g. retailzero.us.auth0.com):");
  const m2mClientId = await ask("M2M Client ID:");
  const m2mClientSecret = await askPassword("M2M Client Secret:");

  // Validate credentials
  const spinner = spin("Validating credentials...");
  try {
    await getManagementToken(domain, m2mClientId, m2mClientSecret);
    spinner.succeed("  Credentials validated");
  } catch (err) {
    spinner.fail("  Invalid credentials");
    fail((err as Error).message);
    fail("Check your M2M app's client ID, secret, and Management API authorization.");
    process.exit(1);
  }

  // ── Step 2: Create Auth0 API ──────────────────────────────

  step(2, "Auth0 API (Resource Server)");
  const token = await getManagementToken(domain, m2mClientId, m2mClientSecret);

  const apiSpinner = spin(`Creating API: ${API_IDENTIFIER}...`);
  try {
    const api = await createResourceServer(token, domain, {
      name: API_NAME,
      identifier: API_IDENTIFIER,
      scopes: SCOPES,
    });
    apiSpinner.succeed(`  API ready: ${c.key(API_IDENTIFIER)}`);
    done(`Scopes: ${SCOPES.map((s) => s.value).join(", ")}`);
  } catch (err) {
    apiSpinner.fail("  Failed to create API");
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 3: Create MCP Server Application ─────────────────

  step(3, "MCP Server Application");
  const appSpinner = spin(`Creating application: ${APP_NAME}...`);
  let appClientId: string;
  let appClientSecret: string;

  try {
    const app = await createClient(token, domain, {
      name: APP_NAME,
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
    });
    appClientId = app.client_id as string;
    appClientSecret = app.client_secret as string;
    appSpinner.succeed(`  Application created: ${c.key(APP_NAME)}`);
  } catch (err) {
    appSpinner.fail("  Failed to create application");
    fail((err as Error).message);
    process.exit(1);
  }

  // Create client grant
  const grantSpinner = spin("Authorizing app for API...");
  try {
    await createClientGrant(token, domain, {
      client_id: appClientId,
      audience: API_IDENTIFIER,
      scope: SCOPES.map((s) => s.value),
    });
    grantSpinner.succeed("  Client grant created");
  } catch (err) {
    grantSpinner.fail("  Failed to create client grant");
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 4: Create Test User ──────────────────────────────

  step(4, "Test User");
  const userSpinner = spin(`Creating user: ${TEST_USER_EMAIL}...`);
  try {
    await createUser(token, domain, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      connection: DB_CONNECTION,
    });
    userSpinner.succeed(`  User ready: ${c.key(TEST_USER_EMAIL)}`);
    info(`Password: ${c.dim(TEST_USER_PASSWORD)}`);
  } catch (err) {
    userSpinner.fail("  Failed to create user");
    warn((err as Error).message);
    warn("Continuing anyway -- user may already exist.");
  }

  // ── Step 5: Create Bounded Authority Action ───────────────

  step(5, "Bounded Authority Action");
  const actionSpinner = spin("Creating post-login Action...");
  try {
    const action = await createAction(token, domain, {
      name: "RetailZero Bounded Authority",
      code: BOUNDED_AUTHORITY_ACTION_CODE,
      supported_triggers: [{ id: "post-login", version: "v3" }],
    });

    const actionId = action.id as string;
    actionSpinner.text = "  Deploying Action...";
    await deployAction(token, domain, actionId);
    actionSpinner.succeed("  Action created and deployed");
    warn("Remember to add this Action to your Login Flow in the Auth0 Dashboard:");
    info(`  Auth0 Dashboard > Actions > Flows > Login > Add "${c.bold("RetailZero Bounded Authority")}"`);
  } catch (err) {
    actionSpinner.fail("  Failed to create Action");
    warn((err as Error).message);
    warn("Continuing -- you can create the Action manually later.");
  }

  // ── Step 6: Generate .env ─────────────────────────────────

  step(6, "Environment File");
  writeEnv([
    {
      header: "Auth0 Configuration (MCP / ChatGPT)",
      entries: [
        { key: "AUTH0_DOMAIN", value: domain },
        { key: "AUTH0_AUDIENCE", value: API_IDENTIFIER },
        { key: "AUTH0_CLIENT_ID", value: appClientId },
        { key: "AUTH0_CLIENT_SECRET", value: appClientSecret },
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

  // ── Step 7: Tunnel (optional) ─────────────────────────────

  step(7, "Public URL (optional)");
  info("ChatGPT needs an HTTPS URL to connect to your MCP server.");
  info("Options: ngrok, Cloudflare Tunnel, or deploy to a cloud provider.");
  console.log();
  info("To start an ngrok tunnel later:");
  info(`  ${c.dim("npx ngrok http 3001")}`);
  console.log();
  info("Then add the tunnel URL to your Auth0 app's Allowed Callback URLs.");

  // ── Done ──────────────────────────────────────────────────

  summaryBox("Setup Complete", [
    ["Auth0 Domain", domain],
    ["API", API_IDENTIFIER],
    ["MCP App", `${APP_NAME} (${appClientId})`],
    ["Test User", `${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`],
    [".env", envPath()],
  ]);

  console.log(c.title("  Next Steps:"));
  console.log();
  info("1. Start the server:");
  info(`   ${c.dim("npm run dev")}`);
  console.log();
  info("2. Add the Action to your Login Flow:");
  info(`   ${c.url(`https://manage.auth0.com/dashboard/us/${domain.split(".")[0]}/actions/flows/login`)}`);
  console.log();
  info("3. Expose the server publicly (ngrok, Cloudflare Tunnel, etc.)");
  console.log();
  info("4. Register in ChatGPT:");
  info("   Settings > Connectors > Add custom connector");
  info(`   URL: ${c.dim("https://<your-tunnel-url>/mcp")}`);
  console.log();
}

main().catch((err) => {
  fail(`Setup failed: ${err.message}`);
  process.exit(1);
});
