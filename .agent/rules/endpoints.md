---
trigger: always_on
description: >-
---

# Custom Endpoints

Custom endpoints are **not authenticated by default**. Always check `req.user`.

## Basic Pattern

```typescript
export const protectedEndpoint: Endpoint = {
  path: '/protected',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const data = await req.payload.find({
      collection: 'orders',
      where: { userId: { equals: req.user.id } },
    })

    return Response.json(data)
  },
}
```

## Route Parameters

```typescript
{
  path: '/:id/tracking',
  method: 'get',
  handler: async (req) => {
    const { id } = req.routeParams
    return Response.json({ id })
  },
}
```

## Endpoint Placement

| Location | Path |
|----------|------|
| Collection | `/api/{collection-slug}/{path}` |
| Global | `/api/globals/{global-slug}/{path}` |
| Root | `/api/{path}` |

## Best Practices

* Always check authentication
* Use `req.payload` for operations
* Use `headersWithCors` for CORS
* Throw `APIError` for errors
* Return Web API `Response`