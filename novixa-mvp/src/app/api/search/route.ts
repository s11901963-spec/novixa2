import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const products = searchProducts(query);

  return NextResponse.json({
    query,
    products,
    totalResults: products.length,
  });
}
