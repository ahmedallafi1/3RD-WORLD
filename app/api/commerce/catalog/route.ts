import { NextResponse } from "next/server";
import { products } from "@/lib/catalog";

export function GET() {
  return NextResponse.json({
    data: products.map(product => ({
      slug: product.slug,
      name: product.name,
      world: product.world,
      category: product.category,
      color: product.color,
      sizes: product.sizes,
      price: { amount: product.price * 100, currency: "USD" },
      description: product.description,
      material: product.material,
      fit: product.fit,
    })),
    meta: {
      source: "phase-03-preview-adapter",
      count: products.length,
    },
  });
}
