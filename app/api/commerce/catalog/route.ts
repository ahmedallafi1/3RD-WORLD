import { NextResponse } from "next/server";
import { getStorefrontProducts } from "@/lib/commerce/storefront-catalog";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic="force-dynamic";

export async function GET() {
  const products=await getStorefrontProducts();
  return NextResponse.json({
    data: products.map(product => ({
      slug: product.slug,
      name: product.name,
      world: product.world,
      category: product.category,
      color: product.color,
      sizes: product.sizes,
      price: { amount: Math.round(product.price * 100), currency: "USD" },
      description: product.description,
      material: product.material,
      fit: product.fit,
      status: product.status??"AVAILABLE",
    })),
    meta: {
      source: isDatabaseConfigured()?"postgres":"fallback-catalog",
      count: products.length,
    },
  });
}
