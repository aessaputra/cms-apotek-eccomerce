---
trigger: on_demand
description: Best practices for Payload CMS upload & Supabase Storage
---

# Upload & Storage Best Practices (Payload CMS + Supabase)

## Overview

This project uses **@payloadcms/storage-s3** with **Supabase Storage** (S3-compatible API) for logo and product image uploads.

## Architecture

| Component | Responsibility |
|-----------|----------------|
| **Media** | Payload upload collection; stores file metadata in DB, files in S3 |
| **Categories.logo** | Upload field → relationTo media |
| **ProductImages.image** | Upload field → relationTo media; syncs URL to image_url |

## Configuration (per Payload docs)

### 1. Plugin Setup

```typescript
import { s3Storage } from '@payloadcms/storage-s3'

s3Storage({
  enabled: Boolean(process.env.S3_ENDPOINT),
  collections: { media: true },
  bucket: process.env.S3_BUCKET,
  config: {
    credentials: { ... },
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true, // Required for Supabase
  },
})
```

### 2. Upload Field

```typescript
{
  name: 'logo',
  type: 'upload',
  relationTo: 'media',
  filterOptions: { mimeType: { contains: 'image' } },
}
```

### 3. Access Control

- **Media**: `create`, `update`, `delete` → `adminOnly`; `read` → public
- **Upload fields**: Inherit collection access

## Supabase S3 Setup

1. Dashboard → Project Settings → S3 Connection
2. Enable S3 access, create credentials
3. Create bucket (e.g. `uploads`)
4. Set env vars per `.env.example`

## Migration

Run `supabase/migrations/20250207_add_upload_columns.sql` after first Payload run (creates media table).

## Best Practices

1. **Always pass `req`** in hooks for transaction safety
2. **Sync URL to legacy fields** for backward compatibility (React Native)
3. **Conditional plugin** – enable S3 only when `S3_ENDPOINT` is set
4. **filterOptions** – restrict upload to images only
5. **Cascade delete to S3** – when deleting ProductImage or clearing Category logo, delete the associated Media document so `@payloadcms/storage-s3` handles S3 file removal (no orphaned files):
   - `ProductImages` afterDelete → delete Media
   - `Categories` afterChange → when logo cleared/replaced, delete old Media
