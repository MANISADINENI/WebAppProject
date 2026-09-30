import type { Config } from "@netlify/functions";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orderItems, orders, products } from "../../db/schema.js";
import { getStripe } from "../../lib/stripe.js";

type CartLine = { slug: string; quantity: number };

export default async (req: Request) => {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json(
      { error: "Checkout isn't configured yet. Add STRIPE_SECRET_KEY to the site's environment variables." },
      { status: 503 },
    );
  }

  let lines: CartLine[];
  try {
    const body = await req.json();
    lines = (body.items ?? [])
      .map((l: CartLine) => ({ slug: String(l.slug), quantity: Math.floor(Number(l.quantity)) }))
      .filter((l: CartLine) => l.slug && l.quantity > 0 && l.quantity <= 20);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (lines.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // Prices always come from the database, never from the browser.
  const found = await db
    .select()
    .from(products)
    .where(and(inArray(products.slug, lines.map((l) => l.slug)), eq(products.active, 1)));
  const bySlug = new Map(found.map((p) => [p.slug, p]));
  const items = lines
    .filter((l) => bySlug.has(l.slug))
    .map((l) => ({ product: bySlug.get(l.slug)!, quantity: l.quantity }));
  if (items.length === 0) {
    return Response.json({ error: "None of those products are available." }, { status: 400 });
  }

  const amountCents = items.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);
  const [order] = await db.insert(orders).values({ amountCents }).returning();
  await db.insert(orderItems).values(
    items.map((i) => ({
      orderId: order.id,
      productId: i.product.id,
      name: i.product.name,
      unitPriceCents: i.product.priceCents,
      quantity: i.quantity,
    })),
  );

  const origin = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: "usd",
        unit_amount: i.product.priceCents,
        product_data: { name: i.product.name, description: i.product.tagline || undefined },
      },
    })),
    shipping_address_collection: items.some((i) => i.product.category !== "digital")
      ? { allowed_countries: ["US", "CA", "GB", "DE", "FR", "NL", "IE", "AU"] }
      : undefined,
    client_reference_id: String(order.id),
    metadata: { orderId: String(order.id) },
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
  });

  await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));

  return Response.json({ url: session.url });
};

export const config: Config = {
  path: "/api/checkout",
  method: "POST",
};
