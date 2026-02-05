---
title: Supabase Integration
description: Payload CMS integration with Supabase PostgreSQL
tags: [supabase, postgres, database]
---

# Supabase Integration for Payload CMS

## Database Adapter

Use `@payloadcms/db-postgres` to connect to Supabase:

```typescript
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'

export default buildConfig({
  db: postgresAdapter({
    pool: {
      connectionString: process.env.SUPABASE_DATABASE_URL,
    },
  }),
  // ... other config
})
```

## Environment Variables

```env
# Supabase PostgreSQL Connection (use connection pooler for serverless)
SUPABASE_DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# For direct connection (migrations)
SUPABASE_DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].supabase.com:5432/postgres
```

## ⚠️ Important: RLS Bypass

Payload CMS connects with **service role** credentials, which **bypasses RLS policies**.

This is intentional for admin operations, but be aware:
- All data access is unrestricted in Payload
- Implement access control in Payload's collection configs
- RLS policies only apply to React Native app (anon/authenticated roles)

---

## 📊 Database Schema Reference

### Tables & Columns

| Table | Columns |
|-------|---------|
| `profiles` | id, email, full_name, phone, role, created_at, updated_at |
| `addresses` | id, user_id, label, recipient_name, phone, address_line, city, postal_code, is_default, created_at, updated_at |
| `categories` | id, name, slug, logo_url, created_at, updated_at |
| `products` | id, name, slug, description, category_id, price, created_at, updated_at |
| `product_images` | id, product_id, image_url, is_primary, sort_order, created_at |
| `inventory` | id, product_id, quantity, low_stock_threshold, updated_at |
| `orders` | id, user_id, address_id, total_amount, status, shipping_name, shipping_address, shipping_phone, created_at, updated_at |
| `order_items` | id, order_id, product_id, product_name, unit_price, quantity, total_price, created_at |
| `cart_items` | id, user_id, product_id, quantity, created_at, updated_at |
| `payments` | id, order_id, midtrans_order_id, midtrans_transaction_id, midtrans_payment_type, amount, status, payment_method, paid_at, expired_at, midtrans_response, created_at, updated_at |

### Field Type Mappings (PostgreSQL → Payload)

| PostgreSQL Type | Payload Field Type |
|-----------------|-------------------|
| `uuid` | `text` (with default gen_random_uuid) |
| `text` | `text` |
| `numeric` / `decimal` | `number` |
| `integer` | `number` |
| `boolean` | `checkbox` |
| `timestamptz` | `date` |
| `jsonb` | `json` |

---

## 🔧 Example Payload Collections

### Products Collection (Matching Supabase Schema)

```typescript
import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price', 'category_id', 'createdAt'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { 
      name: 'category_id', 
      type: 'relationship', 
      relationTo: 'categories',
      required: true 
    },
    { 
      name: 'price', 
      type: 'number', 
      required: true,
      min: 0 
    },
  ],
  timestamps: true,
}
```

### Orders Collection

```typescript
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'status', 'total_amount', 'createdAt'],
  },
  fields: [
    { name: 'user_id', type: 'relationship', relationTo: 'profiles', required: true },
    { name: 'address_id', type: 'relationship', relationTo: 'addresses' },
    { name: 'total_amount', type: 'number', required: true, min: 0 },
    { 
      name: 'status', 
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'confirmed', 'completed', 'cancelled'],
    },
    { name: 'shipping_name', type: 'text', required: true },
    { name: 'shipping_address', type: 'textarea', required: true },
    { name: 'shipping_phone', type: 'text' },
  ],
  timestamps: true,
}
```

### Payments Collection (Midtrans)

```typescript
export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'midtrans_order_id',
    defaultColumns: ['midtrans_order_id', 'status', 'amount', 'createdAt'],
  },
  fields: [
    { name: 'order_id', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'midtrans_order_id', type: 'text', unique: true },
    { name: 'midtrans_transaction_id', type: 'text' },
    { name: 'midtrans_payment_type', type: 'text' },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { 
      name: 'status', 
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'],
    },
    { name: 'payment_method', type: 'text' },
    { name: 'paid_at', type: 'date' },
    { name: 'expired_at', type: 'date' },
    { name: 'midtrans_response', type: 'json' },
  ],
  timestamps: true,
}
```

---

## 📡 Realtime Enabled Tables

These tables have Supabase Realtime enabled (React Native can subscribe):
- `orders`
- `payments`  
- `cart_items`
- `inventory`
