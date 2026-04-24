import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PRODUCTS } from "@/lib/server/products";
import { eventBus } from "@/lib/server/event-bus";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  max_price: z.coerce.number().optional(),
  min_price: z.coerce.number().optional(),
});

export async function GET(request: NextRequest) {
  authenticateUcpRequest(request);

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = SearchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", error_description: parsed.error.message }, { status: 400 });
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
  if (category) results = results.filter((p) => p.category === category);
  if (max_price !== undefined) results = results.filter((p) => p.price <= max_price);
  if (min_price !== undefined) results = results.filter((p) => p.price >= min_price);

  const data = {
    results: results.map((p) => ({
      id: p.id, name: p.name, price: p.price, category: p.category,
      description: p.description, rating: p.rating, reviews: p.reviews, in_stock: p.in_stock,
    })),
    total: results.length,
  };

  eventBus.push({
    type: "tool-call",
    result: "success",
    summary: `UCP catalog search${q ? `: "${q}"` : ""} -- ${results.length} result(s)`,
    details: {
      method: "GET", path: "/ucp/v1/catalog/search",
      toolName: "ucp_catalog_search",
      toolArgs: { q, category, max_price, min_price },
      toolResult: { total: results.length },
    },
  });

  return NextResponse.json(data);
}
