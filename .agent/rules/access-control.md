---
trigger: always_on
description: >-
---

# Access Control

## Common Access Patterns

```typescript
// Anyone
export const anyone: Access = () => true

// Authenticated only
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

// Admin only
export const adminOnly: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

// Admin or self
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  return { id: { equals: user?.id } }
}
```

## Row-Level Security

```typescript
// Order ownership access
export const ownOrdersOnly: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  return { userId: { equals: user?.id } }
}
```

## Field Access (Boolean Only)

```typescript
{
  name: 'salary',
  type: 'number',
  access: {
    read: ({ req: { user }, doc }) => {
      if (user?.id === doc?.id) return true
      return user?.role === 'admin'
    },
  },
}
```

## Important Rules

* Local API bypasses access control by default - use `overrideAccess: false` when passing `user`
* Field-level access ONLY returns boolean (no query constraints)
* The `admin` access control determines if collection appears in admin panel