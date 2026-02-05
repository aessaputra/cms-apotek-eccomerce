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
const posts = await payload.find({
  collection: 'posts',
  where: { status: { equals: 'published' } },
  depth: 2,
  limit: 10,
  sort: '-createdAt',
})

// Find by ID
const post = await payload.findByID({
  collection: 'posts',
  id: '123',
})

// Create
const post = await payload.create({
  collection: 'posts',
  data: { title: 'New Post' },
})

// Update
await payload.update({
  collection: 'posts',
  id: '123',
  data: { status: 'published' },
})
```

## CRITICAL: Access Control in Local API

```typescript
// ❌ WRONG: Bypasses access control
await payload.find({ collection: 'posts', user: currentUser })

// ✅ CORRECT: Respects permissions
await payload.find({
  collection: 'posts',
  user: currentUser,
  overrideAccess: false, // Required!
})
```