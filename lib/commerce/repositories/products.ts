import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db";
import type { CurrencyCode, ProductStatus } from "@/lib/commerce/domain";
import { writeAdminAudit } from "@/lib/commerce/repositories/audit";

export type AdminVariantInput = {
  sku: string;
  title: string;
  size: string;
  color: string;
  priceAmount: number;
  currency: CurrencyCode;
  weightGrams?: number;
  hsCode?: string;
  countryOfOrigin?: string;
};

export type AdminProductInput = {
  slug: string;
  name: string;
  worldId?: string | null;
  category: string;
  description?: string;
  status?: ProductStatus;
  seoTitle?: string;
  seoDescription?: string;
  variants: AdminVariantInput[];
};

export type AdminProductRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  status: ProductStatus;
  worldCode: string | null;
  variants: Array<{
    id: string;
    sku: string;
    title: string;
    size: string;
    color: string;
    priceAmount: number;
    currency: CurrencyCode;
    active: boolean;
  }>;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  status: ProductStatus;
  world_code: string | null;
  variants: unknown;
};

function normalizeVariants(value: unknown): AdminProductRecord["variants"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id),
      sku: String(row.sku),
      title: String(row.title),
      size: String(row.size),
      color: String(row.color),
      priceAmount: Number(row.priceAmount),
      currency: String(row.currency) as CurrencyCode,
      active: Boolean(row.active),
    };
  });
}

export async function listAdminProducts(): Promise<AdminProductRecord[]> {
  const result = await query<ProductRow>(
    `SELECT
       p.id, p.slug, p.name, p.category, p.description, p.status,
       w.code AS world_code,
       COALESCE(
         json_agg(
           json_build_object(
             'id', v.id,
             'sku', v.sku,
             'title', v.title,
             'size', v.size,
             'color', v.color,
             'priceAmount', v.price_amount,
             'currency', v.currency,
             'active', v.active
           )
           ORDER BY v.created_at
         ) FILTER (WHERE v.id IS NOT NULL),
         '[]'::json
       ) AS variants
     FROM products p
     LEFT JOIN worlds w ON w.id = p.world_id
     LEFT JOIN variants v ON v.product_id = p.id
     GROUP BY p.id, w.code
     ORDER BY p.created_at DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    status: row.status,
    worldCode: row.world_code,
    variants: normalizeVariants(row.variants),
  }));
}

async function insertVariants(
  client: PoolClient,
  productId: string,
  variants: AdminVariantInput[],
) {
  for (const variant of variants) {
    await client.query(
      `INSERT INTO variants
       (product_id, sku, title, size, color, price_amount, currency,
        weight_grams, hs_code, country_of_origin, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
      [
        productId,
        variant.sku.trim().toUpperCase(),
        variant.title.trim(),
        variant.size.trim().toUpperCase(),
        variant.color.trim().toUpperCase(),
        variant.priceAmount,
        variant.currency,
        variant.weightGrams ?? null,
        variant.hsCode ?? null,
        variant.countryOfOrigin?.toUpperCase() ?? null,
      ],
    );
  }
}

export async function createProduct(input: AdminProductInput, actorId: string) {
  if (!input.name.trim() || !input.slug.trim() || !input.category.trim()) {
    throw new Error("Name, slug and category are required.");
  }
  if (!input.variants.length) throw new Error("At least one variant is required.");

  return withTransaction(async (client) => {
    const productResult = await client.query<{ id: string }>(
      `INSERT INTO products
       (world_id, slug, name, category, description, status, seo_title, seo_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        input.worldId ?? null,
        input.slug.trim().toLowerCase(),
        input.name.trim(),
        input.category.trim().toUpperCase(),
        input.description?.trim() ?? "",
        input.status ?? "DRAFT",
        input.seoTitle?.trim() ?? null,
        input.seoDescription?.trim() ?? null,
      ],
    );

    const productId = productResult.rows[0].id;
    await insertVariants(client, productId, input.variants);
    await writeAdminAudit(client, {
      actorId,
      action: "PRODUCT_CREATE",
      resourceType: "product",
      resourceId: productId,
      after: input,
    });

    return { id: productId };
  });
}

export async function updateProduct(
  productId: string,
  patch: Partial<Omit<AdminProductInput, "variants">> & { variants?: AdminVariantInput[] },
  actorId: string,
) {
  return withTransaction(async (client) => {
    const before = await client.query(
      "SELECT * FROM products WHERE id = $1 FOR UPDATE",
      [productId],
    );
    if (!before.rows[0]) throw new Error("Product not found.");

    const sets: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (patch.slug !== undefined) add("slug", patch.slug.trim().toLowerCase());
    if (patch.name !== undefined) add("name", patch.name.trim());
    if (patch.worldId !== undefined) add("world_id", patch.worldId || null);
    if (patch.category !== undefined) add("category", patch.category.trim().toUpperCase());
    if (patch.description !== undefined) add("description", patch.description.trim());
    if (patch.status !== undefined) add("status", patch.status);
    if (patch.seoTitle !== undefined) add("seo_title", patch.seoTitle || null);
    if (patch.seoDescription !== undefined) add("seo_description", patch.seoDescription || null);

    if (sets.length) {
      values.push(productId);
      await client.query(
        `UPDATE products SET ${sets.join(", ")}, updated_at = now()
         WHERE id = $${values.length}`,
        values,
      );
    }

    if (patch.variants) {
      await client.query("DELETE FROM variants WHERE product_id = $1", [productId]);
      await insertVariants(client, productId, patch.variants);
    }

    const after = await client.query("SELECT * FROM products WHERE id = $1", [productId]);
    await writeAdminAudit(client, {
      actorId,
      action: "PRODUCT_UPDATE",
      resourceType: "product",
      resourceId: productId,
      before: before.rows[0],
      after: after.rows[0],
    });

    return after.rows[0];
  });
}

export async function archiveProduct(productId: string, actorId: string) {
  return withTransaction(async (client) => {
    const before = await client.query(
      "SELECT * FROM products WHERE id = $1 FOR UPDATE",
      [productId],
    );
    if (!before.rows[0]) throw new Error("Product not found.");

    await client.query(
      "UPDATE products SET status = 'ARCHIVED', updated_at = now() WHERE id = $1",
      [productId],
    );

    await writeAdminAudit(client, {
      actorId,
      action: "PRODUCT_ARCHIVE",
      resourceType: "product",
      resourceId: productId,
      before: before.rows[0],
      after: { ...before.rows[0], status: "ARCHIVED" },
    });
  });
}
