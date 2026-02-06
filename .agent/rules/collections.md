---
trigger: always_on
description: >-
---

# Collections

## Basic Collection

```typescript
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price', 'category_id', 'createdAt'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'category_id', type: 'relationship', relationTo: 'categories' },
    { name: 'price', type: 'number' },
  ],
  timestamps: true,
}
```

## Auth Collection with RBAC

```typescript
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  fields: [
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'customer'],
      defaultValue: 'customer',
      saveToJWT: true, // Include in JWT for fast access checks
    },
  ],
}
```

## Upload Collection

```typescript
export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'public/media',
  },
}
```

## Versioning & Drafts (Optional)

```typescript
export const Products: CollectionConfig = {
  slug: 'products',
  versions: {
    drafts: { autosave: true, schedulePublish: true },
    maxPerDoc: 100,
  },
}
```