---
trigger: always_on
description: >-
---

# Fields

## Common Patterns

```typescript
// Auto-generate slugs
slugField({ fieldToUse: 'title' })

// Relationship with filtering
{
  name: 'category',
  type: 'relationship',
  relationTo: 'categories',
  filterOptions: { active: { equals: true } },
}

// Conditional field
{
  name: 'featuredImage',
  type: 'upload',
  relationTo: 'media',
  admin: {
    condition: (data) => data.featured === true,
  },
}

// Virtual field
{
  name: 'fullName',
  type: 'text',
  virtual: true,
  hooks: {
    afterRead: [({ siblingData }) => `${siblingData.firstName} ${siblingData.lastName}`],
  },
}
```

## Field Types

| Type | Use Case |
|------|----------|
| `text` | Single line text |
| `textarea` | Multi-line text |
| `richText` | Lexical editor content |
| `number` | Numeric values |
| `date` | Dates and timestamps |
| `checkbox` | Boolean values |
| `select` | Dropdown options |
| `relationship` | References to other docs |
| `upload` | File uploads |
| `array` | Repeatable groups |
| `blocks` | Flexible content blocks |
| `group` | Named field groups |
| `tabs` | Tabbed field groups |
| `json` | Raw JSON data |

## Validation

```typescript
{
  name: 'email',
  type: 'email',
  validate: (value, { operation }) => {
    if (operation === 'create' && !value) {
      return 'Email is required'
    }
    return true
  },
}
```