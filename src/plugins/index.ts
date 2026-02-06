import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'

import { Plugin } from 'payload'

import { midtransAdapter } from '@/payments/midtrans'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isDocumentOwner } from '@/access/isDocumentOwner'
import { Addresses } from '@/collections/Addresses'
import { OrdersCollection } from '@/collections/Orders'
import { ProductsCollection } from '@/collections/Products'
import { TransactionsCollection } from '@/collections/Transactions'




export const plugins: Plugin[] = [


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
    },
    orders: {
      ordersCollectionOverride: OrdersCollection,
    },
    addresses: {
      addressesCollectionOverride: () => Addresses,
    },
  }),


]
