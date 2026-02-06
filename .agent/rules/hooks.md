---
trigger: always_on
description: >-
---

# Hooks

## Collection Hooks

```typescript
export const Products: CollectionConfig = {
  slug: 'products',
  hooks: {
    // Before validation - format data
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation === 'create' && data.name) {
          data.slug = slugify(data.name)
        }
        return data
      },
    ],

    // Before save - business logic
    beforeChange: [
      async ({ data }) => {
        if (typeof data.price === 'number' && data.price < 0) {
          throw new Error('Price must be >= 0')
        }
        return data
      },
    ],

    // After save - side effects
    afterChange: [
      async ({ doc, operation, context }) => {
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
          collection: 'product_images',
          where: { productId: { equals: id } },
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