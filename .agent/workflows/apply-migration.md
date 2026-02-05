---
name: apply-migration
description: >-
  Apply Supabase database migration for schema changes.
  Use when adding new tables, modifying columns, creating indexes, or updating RLS policies.
---

# Apply Migration

When applying a database migration:

1. Review the change needed
2. Create SQL migration matching `database-schema-spec.md` patterns:
   - Use UUID primary keys with `gen_random_uuid()`
   - Enable RLS on all tables
   - Create appropriate RLS policies
   - Add indexes for foreign keys and commonly queried fields
3. Apply using Supabase MCP `apply_migration` tool
4. Update `database-schema-spec.md` with new schema
5. Update `.agent/rules/supabase-integration.md` with new columns
