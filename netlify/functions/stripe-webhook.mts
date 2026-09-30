import type { Config } from "@netlify/functions";
import type Stripe from "stripe";
import { getStripe, syncOrderFromSession } from "../../lib/stripe.js";

export default async (req: Request) => {
  const stripe = getStripe();
  const secret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) {
    return new Response("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      await syncOrderFromSession(event.data.object as Stripe.Checkout.Session);
      break;
  }

  return Response.json({ received: true });
};

export const config: Config = {
  path: "/api/stripe-webhook",
  method: "POST",
};
