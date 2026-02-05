import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { slugField } from 'payload'
import {
  calculateProductAvailability,
  validatePharmacyFields
} from './hooks'

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  dbName: 'products',
  admin: {
    ...defaultCollection?.admin,
    defaultColumns: ['title', 'generic_name', 'manufacturer', 'requires_prescription', '_status'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'products',
        req,
      }),
    useAsTitle: 'title',
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
    meta: true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
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
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: false,
            },


          ],
          label: 'Content',
        },
        {
          fields: [
            ...defaultCollection.fields,
            {
              name: 'generic_name',
              type: 'text',
              index: true, // Index for search functionality
              admin: {
                description: 'Scientific/generic name of the drug (e.g., "Acetaminophen" for Tylenol)',
                position: 'sidebar',
              },
            },
            {
              name: 'manufacturer',
              type: 'text',
              index: true, // Index for manufacturer filtering
              admin: {
                description: 'Manufacturer or brand name (e.g., "Johnson & Johnson", "Pfizer")',
                position: 'sidebar',
              },
            },
            {
              name: 'dosage_form',
              type: 'select',
              options: [
                { label: 'Tablet', value: 'tablet' },
                { label: 'Capsule', value: 'capsule' },
                { label: 'Syrup', value: 'syrup' },
                { label: 'Liquid', value: 'liquid' },
                { label: 'Cream', value: 'cream' },
                { label: 'Ointment', value: 'ointment' },
                { label: 'Gel', value: 'gel' },
                { label: 'Injection', value: 'injection' },
                { label: 'Drops', value: 'drops' },
                { label: 'Spray', value: 'spray' },
                { label: 'Patch', value: 'patch' },
                { label: 'Powder', value: 'powder' },
                { label: 'Suppository', value: 'suppository' },
                { label: 'Inhaler', value: 'inhaler' },
                { label: 'Other', value: 'other' },
              ],
              admin: {
                description: 'Physical form of the medication',
                position: 'sidebar',
              },
            },
            {
              name: 'strength',
              type: 'text',
              admin: {
                description: 'Strength/concentration of the medication (e.g., "500mg", "10ml", "2.5%")',
                position: 'sidebar',
              },
            },
            {
              name: 'requires_prescription',
              type: 'checkbox',
              defaultValue: false,
              index: true, // Index for prescription filtering
              admin: {
                description: 'Check if this product requires a prescription to purchase',
                position: 'sidebar',
              },
            },

          ],
          label: 'Product Details',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
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
    slugField(),
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
    beforeChange: [validatePharmacyFields],
    afterRead: [calculateProductAvailability],
  },
})
