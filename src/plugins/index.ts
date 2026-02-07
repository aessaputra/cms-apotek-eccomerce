import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { s3Storage } from '@payloadcms/storage-s3'

import { Plugin } from 'payload'

import { midtransAdapter } from '@/payments/midtrans'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { fixPreferencesAccess } from '@/plugins/fixPreferencesAccess'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isDocumentOwner } from '@/access/isDocumentOwner'
import { Addresses } from '@/collections/Addresses'
import { OrdersCollection } from '@/collections/Orders'
import { ProductsCollection } from '@/collections/Products'
import { TransactionsCollection } from '@/collections/Transactions'
import { VariantOptionsCollectionOverride } from '@/collections/VariantOptions'
import { VariantTypesCollectionOverride } from '@/collections/VariantTypes'




export const plugins: Plugin[] = [
  // Fix: user.relationTo QueryError on admin load (single auth collection)
  fixPreferencesAccess,
  // Supabase Storage via S3-compatible API
  // @see https://payloadcms.com/docs/upload/storage-adapters
  s3Storage({
    enabled: Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID),
    collections: {
      media: true,
    },
    bucket: process.env.S3_BUCKET || 'uploads',
    config: {
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
    },
  }),
  ecommercePlugin({
    access: {
      adminOnlyFieldAccess,
      adminOrPublishedStatus,
      customerOnlyFieldAccess,
      isAdmin,
      isDocumentOwner,
    },
    customers: {
      slug: 'users',
    },
    payments: {
      paymentMethods: [
        midtransAdapter({
          serverKey: process.env.MIDTRANS_SERVER_KEY!,
          clientKey: process.env.MIDTRANS_CLIENT_KEY!,
          isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        }),
      ],
    },
    transactions: {
      transactionsCollectionOverride: TransactionsCollection,
    },
    products: {
      productsCollectionOverride: ProductsCollection,
      variants: {
        variantOptionsCollectionOverride: VariantOptionsCollectionOverride,
        variantTypesCollectionOverride: VariantTypesCollectionOverride,
      },
    },
    orders: {
      ordersCollectionOverride: OrdersCollection,
    },
    addresses: {
      addressesCollectionOverride: () => Addresses,
    },
  }),


]
