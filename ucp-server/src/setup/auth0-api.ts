/**
 * Auth0 Management API v2 client.
 * Thin fetch wrapper -- no SDK dependency.
 * All operations are idempotent where possible.
 */

interface ManagementTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ResourceServerConfig {
  name: string;
  identifier: string;
  scopes: Array<{ value: string; description: string }>;
}

interface ClientConfig {
  name: string;
  app_type: "non_interactive" | "regular_web" | "spa";
  grant_types: string[];
  callbacks?: string[];
  web_origins?: string[];
}

interface ClientGrantConfig {
  client_id: string;
  audience: string;
  scope: string[];
}

interface UserConfig {
  email: string;
  password: string;
  connection: string;
}

interface ActionConfig {
  name: string;
  code: string;
  supported_triggers: Array<{ id: string; version: string }>;
}

export interface Auth0Resource {
  id: string;
  [key: string]: unknown;
}

// ── Token exchange ──────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getManagementToken(
  domain: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get Management API token (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ManagementTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

// ── Generic API helper ──────────────────────────────────────

async function mgmtRequest(
  method: string,
  domain: string,
  token: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`https://${domain}/api/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as Record<string, unknown>;
  return { status: res.status, data };
}

// ── Resource Servers (APIs) ─────────────────────────────────

export async function createResourceServer(
  token: string,
  domain: string,
  config: ResourceServerConfig
): Promise<Auth0Resource> {
  const { status, data } = await mgmtRequest("POST", domain, token, "/resource-servers", {
    name: config.name,
    identifier: config.identifier,
    scopes: config.scopes,
    signing_alg: "RS256",
    token_lifetime: 86400,
    allow_offline_access: true,
  });

  // 409 = already exists, find and return it
  if (status === 409) {
    const existing = await findResourceServer(token, domain, config.identifier);
    if (existing) return existing;
    throw new Error(`API already exists but could not be found: ${config.identifier}`);
  }

  if (status !== 201 && status !== 200) {
    throw new Error(`Failed to create API (${status}): ${JSON.stringify(data)}`);
  }

  return data as Auth0Resource;
}

async function findResourceServer(
  token: string,
  domain: string,
  identifier: string
): Promise<Auth0Resource | null> {
  const { status, data } = await mgmtRequest(
    "GET",
    domain,
    token,
    `/resource-servers?identifier=${encodeURIComponent(identifier)}`
  );
  if (status !== 200) return null;
  const servers = data as unknown as Auth0Resource[];
  return servers.find((s) => s.identifier === identifier) || null;
}

// ── Applications (Clients) ──────────────────────────────────

export async function createClient(
  token: string,
  domain: string,
  config: ClientConfig
): Promise<Auth0Resource> {
  const { status, data } = await mgmtRequest("POST", domain, token, "/clients", {
    name: config.name,
    app_type: config.app_type,
    grant_types: config.grant_types,
    callbacks: config.callbacks || [],
    web_origins: config.web_origins || [],
    token_endpoint_auth_method: config.app_type === "spa" ? "none" : "client_secret_post",
  });

  if (status !== 201 && status !== 200) {
    throw new Error(`Failed to create application (${status}): ${JSON.stringify(data)}`);
  }

  return data as Auth0Resource;
}

export async function updateClient(
  token: string,
  domain: string,
  clientId: string,
  updates: Record<string, unknown>
): Promise<Auth0Resource> {
  const { status, data } = await mgmtRequest(
    "PATCH",
    domain,
    token,
    `/clients/${clientId}`,
    updates
  );

  if (status !== 200) {
    throw new Error(`Failed to update application (${status}): ${JSON.stringify(data)}`);
  }

  return data as Auth0Resource;
}

// ── Client Grants ───────────────────────────────────────────

export async function createClientGrant(
  token: string,
  domain: string,
  config: ClientGrantConfig
): Promise<Auth0Resource> {
  const { status, data } = await mgmtRequest("POST", domain, token, "/client-grants", {
    client_id: config.client_id,
    audience: config.audience,
    scope: config.scope,
  });

  // 409 = grant already exists
  if (status === 409) {
    return { id: "existing-grant" } as Auth0Resource;
  }

  if (status !== 201 && status !== 200) {
    throw new Error(`Failed to create client grant (${status}): ${JSON.stringify(data)}`);
  }

  return data as Auth0Resource;
}

// ── Users ───────────────────────────────────────────────────

export async function createUser(
  token: string,
  domain: string,
  config: UserConfig
): Promise<Auth0Resource> {
  const { status, data } = await mgmtRequest("POST", domain, token, "/users", {
    email: config.email,
    password: config.password,
    connection: config.connection,
    email_verified: true,
  });

  // 409 = user already exists
  if (status === 409) {
    return { id: "existing-user", email: config.email } as Auth0Resource;
  }

  if (status !== 201 && status !== 200) {
    throw new Error(`Failed to create user (${status}): ${JSON.stringify(data)}`);
  }

  return data as Auth0Resource;
}

// ── Actions ─────────────────────────────────────────────────

export async function createAction(
  token: string,
  domain: string,
  config: ActionConfig
): Promise<Auth0Resource> {
  const { status, data } = await mgmtRequest("POST", domain, token, "/actions/actions", {
    name: config.name,
    code: config.code,
    supported_triggers: config.supported_triggers,
    runtime: "node18",
  });

  if (status !== 201 && status !== 200) {
    // If action with same name exists, try to find it
    if (status === 409) {
      const existing = await findAction(token, domain, config.name);
      if (existing) return existing;
    }
    throw new Error(`Failed to create action (${status}): ${JSON.stringify(data)}`);
  }

  return data as Auth0Resource;
}

export async function deployAction(
  token: string,
  domain: string,
  actionId: string
): Promise<void> {
  const { status, data } = await mgmtRequest(
    "POST",
    domain,
    token,
    `/actions/actions/${actionId}/deploy`,
    {}
  );

  if (status !== 200 && status !== 201) {
    throw new Error(`Failed to deploy action (${status}): ${JSON.stringify(data)}`);
  }
}

async function findAction(
  token: string,
  domain: string,
  name: string
): Promise<Auth0Resource | null> {
  const { status, data } = await mgmtRequest("GET", domain, token, "/actions/actions");
  if (status !== 200) return null;
  const actions = (data as Record<string, unknown>).actions as Auth0Resource[] | undefined;
  if (!actions) return null;
  return actions.find((a) => a.name === name) || null;
}
