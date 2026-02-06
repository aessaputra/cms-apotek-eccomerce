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

Core business tables include: `profiles`, `addresses`, `categories`, `products`, `product_images`, `inventory`, `orders`, `order_items`, `cart_items`, `payments`.

## Field Type Mappings

* PostgreSQL `uuid` → Payload `text`
* PostgreSQL `numeric/decimal` → Payload `number`
* PostgreSQL `timestamptz` → Payload `date`
* PostgreSQL `jsonb` → Payload `json`
* PostgreSQL `boolean` → Payload `checkbox`