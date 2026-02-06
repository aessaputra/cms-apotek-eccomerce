import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

import {
  calculateProductAvailability
} from './hooks'

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  dbName: 'products',
  versions: false,
  lockDocuments: false,
  admin: {
    ...defaultCollection?.admin,
    defaultColumns: ['title', '_status'],

    useAsTitle: 'title',
  },
  access: {
    create: adminOnly,
    read: publicAccess,
    update: adminOnly,
    delete: adminOnly,
  },
  defaultPopulate: {
    ...defaultCollection?.defaultPopulate,
    title: true,
    slug: true,
    variantOptions: true,
    variants: true,
    enableVariants: true,

    priceInUSD: true,
    inventory: true,

  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      dbName: 'title',
    },
    {
      name: 'name',
      type: 'text',
      required: false,
      dbName: 'name',
      admin: { hidden: true, readOnly: true, description: 'Synced from title for React Native' },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'description',
              type: 'textarea',
              required: false,
            },


          ],
          label: 'Content',
        },
        {
          fields: [
            ...defaultCollection.fields,
          ],
          label: 'Product Details',
        },

      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      required: true,
      admin: {
        position: 'sidebar',
        sortOptions: 'name', // Categories uses 'name' as title
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
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        // Generate slug from title if not provided
        if (operation === 'create' && data && !data.slug && data.title) {
          data.slug = data.title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .substring(0, 100)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data }) => {
        if (data?.title != null) {
          data.name = data.title as string
        }
        return data
      },
    ],
    afterRead: [calculateProductAvailability],
  },
})
