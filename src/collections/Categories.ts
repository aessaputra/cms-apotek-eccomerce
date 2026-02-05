import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: publicAccess,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'logo', 'controlled_substance', 'prescription_required', 'is_active'],
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
    slugField({
      fieldToUse: 'name',
    }),
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Category logo/icon image',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Brief description of the product category',
      },
    },
    {
      name: 'controlled_substance',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Check if this category contains controlled substances requiring special handling',
        position: 'sidebar',
      },
    },
    {
      name: 'prescription_required',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Check if products in this category typically require prescriptions',
        position: 'sidebar',
      },
    },
    {
      name: 'age_restriction',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: 'Minimum age required to purchase products in this category (leave empty for no restriction)',
        position: 'sidebar',
      },
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Controls whether this category is active and visible to customers',
        position: 'sidebar',
      },
    },
    {
      name: 'sort_order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Sort order for category display (lower numbers appear first)',
        position: 'sidebar',
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
