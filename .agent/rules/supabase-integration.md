---
trigger: always_on
description: >-
---

# Supabase Integration Rules

## Database Connection

* Use `@payloadcms/db-postgres` adapter to connect to Supabase PostgreSQL
* Connection string uses Supabase connection pooler for serverless environment
* Environment variable: `DATABASE_URL` (Payload uses this in `src/payload.config.ts`)

## RLS Considerations

* Payload CMS uses service role (bypasses RLS policies)
* Implement access control in Payload collection configs instead
* RLS only applies to React Native app (anon/authenticated roles)

## Schema Reference

Use Supabase MCP (`list_tables`) as the source of truth, then keep `src/db/supabase-schema.ts` aligned.

Tables and columns (snapshot):

* `profiles`: id, email, full_name, phone, role, created_at, updated_at
* `addresses`: id, user_id, label, recipient_name, phone, address_line, city, postal_code, is_default, created_at, updated_at
* `categories`: id, name, slug, logo_url, created_at, updated_at
* `products`: id, name, slug, description, category_id, price, created_at, updated_at
* `product_images`: id, product_id, image_url, is_primary, sort_order, created_at
* `inventory`: id, product_id, quantity, low_stock_threshold, updated_at
* `orders`: id, user_id, address_id, total_amount, status, shipping_name, shipping_address, shipping_phone, created_at, updated_at
* `order_items`: id, order_id, product_id, product_name, unit_price, quantity, total_price, created_at
* `cart_items`: id, user_id, product_id, quantity, created_at, updated_at
* `payments`: id, order_id, midtrans_order_id, midtrans_transaction_id, midtrans_payment_type, amount, status, payment_method, paid_at, expired_at, midtrans_response, created_at, updated_at

## Field Type Mappings

* PostgreSQL `uuid` → Payload `text`
* PostgreSQL `numeric/decimal` → Payload `number`
* PostgreSQL `timestamptz` → Payload `date`
* PostgreSQL `jsonb` → Payload `json`
* PostgreSQL `boolean` → Payload `checkbox`