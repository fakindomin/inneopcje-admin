import { NextResponse } from "next/server";
import { getProductBySlug, getAlternatives } from "../../../../lib/queries";

export async function GET(request, { params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const alternatives = await getAlternatives(product.id);
  return NextResponse.json({ product, alternatives });
}
