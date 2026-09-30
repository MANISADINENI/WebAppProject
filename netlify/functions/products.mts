import type { Config } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";

export default async () => {
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      description: products.description,
      category: products.category,
      priceCents: products.priceCents,
      glyph: products.glyph,
      tone: products.tone,
    })
    .from(products)
    .where(eq(products.active, 1))
    .orderBy(asc(products.id));

  return Response.json(rows, { headers: { "Cache-Control": "public, max-age=60" } });
};

export const config: Config = {
  path: "/api/products",
  method: "GET",
};
