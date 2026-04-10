import { Hono } from "hono";
import { z } from "zod";
import { PRODUCTS } from "./data/products.js";

const app = new Hono();

const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  max_price: z.coerce.number().optional(),
  min_price: z.coerce.number().optional(),
});

// Search products
app.get("/ucp/v1/catalog/search", (c) => {
  const parsed = SearchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "invalid_request", error_description: parsed.error.message }, 400);
  }

  const { q, category, max_price, min_price } = parsed.data;
  let results = [...PRODUCTS];

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }

  if (category) {
    results = results.filter((p) => p.category === category);
  }

  if (max_price !== undefined) {
    results = results.filter((p) => p.price <= max_price);
  }

  if (min_price !== undefined) {
    results = results.filter((p) => p.price >= min_price);
  }

  return c.json({
    results: results.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      description: p.description,
      rating: p.rating,
      reviews: p.reviews,
      in_stock: p.in_stock,
    })),
    total: results.length,
  });
});

// Get product by ID
app.get("/ucp/v1/catalog/products/:id", (c) => {
  const product = PRODUCTS.find((p) => p.id === c.req.param("id"));
  if (!product) {
    return c.json({ error: "not_found", error_description: "Product not found" }, 404);
  }
  return c.json(product);
});

export { app as catalogRoutes };
