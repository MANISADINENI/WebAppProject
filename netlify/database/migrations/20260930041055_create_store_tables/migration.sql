CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"stripe_session_id" text UNIQUE,
	"status" text DEFAULT 'pending' NOT NULL,
	"email" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"price_cents" integer NOT NULL,
	"glyph" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT '#d9562b' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");