---
trigger: always_on
description: >-
---

# Payload CMS Overview

## Core Principles

1. **TypeScript-First**: Always use TypeScript with proper types from Payload
2. **Security-Critical**: Follow all security patterns, especially access control
3. **Type Generation**: Run `generate:types` script after schema changes
4. **Transaction Safety**: Always pass `req` to nested operations in hooks
5. **Access Control**: Local API bypasses access control by default - use `overrideAccess: false`

## Project Structure

```
src/
├── app/
│   └── (payload)/           # Payload admin routes
├── collections/             # Collection configs
├── globals/                 # Global configs
├── components/              # Custom React components
├── hooks/                   # Hook functions
├── access/                  # Access control functions
└── payload.config.ts        # Main config
```

## Getting Payload Instance

```typescript
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'products' })
```

## Quick Reference

| Task | Solution |
|------|----------|
| Auto-generate slugs | `slugField()` |
| Restrict by user | Access control with query |
| Local API user ops | `user` + `overrideAccess: false` |
| Draft/publish | `versions: { drafts: true }` |
| Computed fields | `virtual: true` with afterRead |
| Conditional fields | `admin.condition` |
| Prevent loops | `req.context` check |
| Transactions | Pass `req` to operations |