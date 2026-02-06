---
trigger: always_on
description: >-
---

# Adapters

## Database: PostgreSQL (for Supabase)

```typescript
import { postgresAdapter } from '@payloadcms/db-postgres'

export default buildConfig({
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
})
```

## Transactions

**CRITICAL**: Always pass `req` to nested operations in hooks.

```typescript
// ✅ CORRECT: Thread req through operations
const hook: CollectionAfterChangeHook = async ({ doc, req }) => {
  await req.payload.find({
    collection: 'children',
    where: { parent: { equals: doc.id } },
    req, // Maintains transaction context
  })
}

// ❌ WRONG: Missing req breaks transaction
const hook: CollectionAfterChangeHook = async ({ doc, req }) => {
  await req.payload.find({
    collection: 'children',
    // Missing req - separate transaction!
  })
}
```

## Storage Adapters

| Adapter | Package |
|---------|---------|
| AWS S3 | `@payloadcms/storage-s3` |
| Azure Blob | `@payloadcms/storage-azure` |
| Google Cloud | `@payloadcms/storage-gcs` |
| Cloudflare R2 | `@payloadcms/storage-r2` |
| Vercel Blob | `@payloadcms/storage-vercel-blob` |

## Email Adapters

| Adapter | Package |
|---------|---------|
| Nodemailer | `@payloadcms/email-nodemailer` |
| Resend | `@payloadcms/email-resend` |