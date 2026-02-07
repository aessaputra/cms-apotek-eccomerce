import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import {
  BoldFeature,
  EXPERIMENTAL_TableFeature,
  IndentFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Admins } from '@/collections/Admins'
import { CartItems } from '@/collections/CartItems'
import { Categories } from '@/collections/Categories'
import { Inventory } from '@/collections/Inventory'
import { Media } from '@/collections/Media'

import { ProductImages } from '@/collections/ProductImages'
import { Users } from '@/collections/Users'
import { supabaseSchemaHook } from '@/db/supabase-schema'
import { pharmacyEndpoints } from '@/endpoints'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  email: resendAdapter({
    defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@payloadcms.com',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'Apotek CMS',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  admin: {
    user: Admins.slug, // Admins only; customers use Customer App (Supabase Auth)
  },
  i18n: {
    translations: {
      en: {
        general: {
          // Friendlier empty state for Join/Relationship tables (no confusing "filters" when none applied)
          noResults: 'No {{label}} yet. Use the button above to add.',
        },
      },
    },
  },
  lockDocuments: false,
  collections: [Admins, Users, CartItems, Categories, Media, Inventory, ProductImages],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    idType: 'uuid',
    // Disable auto schema push - prevents Payload from modifying existing Supabase tables
    push: false,
    // Register existing Supabase tables to prevent conflicts
    beforeSchemaInit: [supabaseSchemaHook],
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: [],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),

  endpoints: pharmacyEndpoints,
  // globals: [Header, Footer], // Removed for Headless setup
  plugins,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  // sharp,
})
