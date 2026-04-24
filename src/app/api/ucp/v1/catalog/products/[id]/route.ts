import { type NextRequest, NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/server/products";
import { authenticateUcpRequest } from "@/lib/server/ucp-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  authenticateUcpRequest(request);
  const { id } = await params;
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "not_found", error_description: "Product not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}
