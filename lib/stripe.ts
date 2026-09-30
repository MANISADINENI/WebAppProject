import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";

export function getStripe(): Stripe | null {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  return key ? new Stripe(key) : null;
}

// Mark the order matching a Checkout Session as paid or expired. Safe to call repeatedly.
export async function syncOrderFromSession(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid") {
    await db
      .update(orders)
      .set({
        status: "paid",
        email: session.customer_details?.email ?? null,
        paidAt: new Date(),
      })
      .where(eq(orders.stripeSessionId, session.id));
  } else if (session.status === "expired") {
    await db.update(orders).set({ status: "expired" }).where(eq(orders.stripeSessionId, session.id));
  }
}
