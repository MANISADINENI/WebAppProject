import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  tagline: text().notNull().default(""),
  description: text().notNull().default(""),
  category: text().notNull(),
  priceCents: integer("price_cents").notNull(),
  glyph: text().notNull().default(""),
  tone: text().notNull().default("#d9562b"),
  active: integer().notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  stripeSessionId: text("stripe_session_id").unique(),
  status: text().notNull().default("pending"),
  email: text(),
  amountCents: integer("amount_cents").notNull(),
  currency: text().notNull().default("usd"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const orderItems = pgTable("order_items", {
  id: serial().primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text().notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer().notNull(),
});
