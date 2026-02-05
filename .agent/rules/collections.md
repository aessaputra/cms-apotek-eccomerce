---
trigger: always_on
description: >-
---

# Collections

## Basic Collection

```typescript
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'createdAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'content', type: 'richText' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
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
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: ['admin', 'editor', 'user'],
      defaultValue: ['user'],
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
    staticDir: 'media',
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300 },
      { name: 'card', width: 768, height: 1024 },
    ],
    focalPoint: true,
    crop: true,
  },
}
```

## Versioning & Drafts

```typescript
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: {
    drafts: { autosave: true, schedulePublish: true },
    maxPerDoc: 100,
  },
}
```