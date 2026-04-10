import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { wellKnownRoutes } from "./well-known.js";
import { catalogRoutes } from "./catalog.js";
import { checkoutRoutes } from "./checkout.js";
import { orderRoutes } from "./orders.js";
import { authMiddleware } from "./auth.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Public: UCP discovery (no auth required)
app.route("/", wellKnownRoutes);

// Protected: UCP commerce endpoints
app.use("/ucp/*", authMiddleware);
app.route("/", catalogRoutes);
app.route("/", checkoutRoutes);
app.route("/", orderRoutes);

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "stylevault-ucp-server" }));

const port = parseInt(process.env.PORT ?? "3001", 10);

console.log(`StyleVault UCP Server starting on port ${port}`);
console.log(`UCP Discovery: http://localhost:${port}/.well-known/ucp`);
console.log(`Catalog: http://localhost:${port}/ucp/v1/catalog/search`);
console.log(`Checkout: http://localhost:${port}/ucp/v1/checkout/sessions`);
console.log(`Orders: http://localhost:${port}/ucp/v1/orders`);

serve({ fetch: app.fetch, port });
