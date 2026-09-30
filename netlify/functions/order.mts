import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orderItems, orders } from "../../db/schema.js";
import { getStripe, syncOrderFromSession } from "../../lib/stripe.js";

// Looks up an order by its Checkout Session id (only known to the buyer) and
// confirms payment status with Stripe, so the receipt works even before the webhook lands.
export default async (_req: Request, context: Context) => {
  const sessionId = context.params.sessionId;
  const stripe = getStripe();
  if (!stripe || !sessionId) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  let status = order.status;
  let email = order.email;
  if (status === "pending") {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    await syncOrderFromSession(session);
    if (session.payment_status === "paid") {
      status = "paid";
      email = session.customer_details?.email ?? email;
    }
  }

  const items = await db
    .select({ name: orderItems.name, unitPriceCents: orderItems.unitPriceCents, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return Response.json({
    id: order.id,
    status,
    email,
    amountCents: order.amountCents,
    currency: order.currency,
    createdAt: order.createdAt,
    items,
  });
};

export const config: Config = {
  path: "/api/orders/:sessionId",
  method: "GET",
};
