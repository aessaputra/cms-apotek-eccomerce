import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'

/**
 * Categories collection - Strict schema match with Supabase 'categories' table
 * DB columns: id, name, slug, logo_url, created_at, updated_at
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  dbName: 'categories',
  lockDocuments: false,
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: publicAccess,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'slug', 'logo_url'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Category name (e.g., "Pain Relief", "Antibiotics", "Vitamins")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'logo_url',
      type: 'text',
      label: 'Logo URL',
      admin: {
        description: 'URL of the category logo/icon image',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate slug if not provided
        if (operation === 'create' && !data.slug && data.name) {
          data.slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
        }
        return data
      },
    ],
  },
}
