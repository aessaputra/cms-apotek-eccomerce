---
name: generate-collection
description: >-
  Generate Payload CMS collection configs that match existing Supabase tables.
  Use when creating new Payload collections, asked to scaffold collections, or asked to connect Payload to database tables.
---

# Generate Collection

When generating a new Payload CMS collection:

1. Match the table name from `database-schema-spec.md`
2. Use `dbName` to match exact Supabase table name
3. Map PostgreSQL types to Payload field types:
   - `uuid` → `text`
   - `numeric` → `number`
   - `timestamptz` → `date`
   - `jsonb` → `json`
   - `boolean` → `checkbox`
4. Add proper access control in the collection config
5. Use `timestamps: true` for tables with created_at/updated_at
6. Run `payload generate:types` after creating the collection
