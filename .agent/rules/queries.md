---
trigger: always_on
description: >-
---

# Queries

## Query Operators

```typescript
{ color: { equals: 'blue' } }
{ status: { not_equals: 'draft' } }
{ price: { greater_than: 100 } }
{ title: { contains: 'payload' } }
{ category: { in: ['tech', 'news'] } }
{ image: { exists: true } }
```

## AND/OR Logic

```typescript
{
  or: [
    { color: { equals: 'mint' } },
    { and: [
      { color: { equals: 'white' } },
      { featured: { equals: false } },
    ]},
  ],
}
```

## Local API

```typescript
// Find documents
const products = await payload.find({
  collection: 'products',
  where: { price: { greater_than: 0 } },
  depth: 2,
  limit: 10,
  sort: '-createdAt',
})

// Find by ID
const product = await payload.findByID({
  collection: 'products',
  id: '123',
})

// Create
const product = await payload.create({
  collection: 'products',
  data: { name: 'New Product' },
})

// Update
await payload.update({
  collection: 'products',
  id: '123',
  data: { price: 100 },
})
```

## CRITICAL: Access Control in Local API

```typescript
// ❌ WRONG: Bypasses access control
await payload.find({ collection: 'orders', user: currentUser })

// ✅ CORRECT: Respects permissions
await payload.find({
  collection: 'orders',
  user: currentUser,
  overrideAccess: false, // Required!
})
```