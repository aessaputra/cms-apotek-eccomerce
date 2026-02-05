---
trigger: always_on
description: >-
---

# Hooks

## Collection Hooks

```typescript
export const Posts: CollectionConfig = {
  slug: 'posts',
  hooks: {
    // Before validation - format data
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          data.slug = slugify(data.title)
        }
        return data
      },
    ],

    // Before save - business logic
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'update' && data.status === 'published') {
          data.publishedAt = new Date()
        }
        return data
      },
    ],

    // After save - side effects
    afterChange: [
      async ({ doc, req, operation, context }) => {
        if (context.skipNotification) return
        if (operation === 'create') {
          await sendNotification(doc)
        }
        return doc
      },
    ],

    // Before delete - cascading deletes
    beforeDelete: [
      async ({ req, id }) => {
        await req.payload.delete({
          collection: 'comments',
          where: { post: { equals: id } },
          req, // Important for transaction
        })
      },
    ],
  },
}
```

## Best Practices

* Use `beforeValidate` for data formatting
* Use `beforeChange` for business logic
* Use `afterChange` for side effects
* Use `afterRead` for computed fields
* Store expensive operations in `context`
* Pass `req` to nested operations for transaction safety
* Use context flags to prevent infinite loops