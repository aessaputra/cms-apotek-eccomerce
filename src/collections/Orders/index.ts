import { adminOrOrderOwner } from '@/access/adminOrOrderOwner'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'

export const OrdersCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  dbName: 'orders',
  lockDocuments: false,
  hooks: {
    ...defaultCollection?.hooks,
  },
  admin: {
    ...defaultCollection?.admin,
    defaultColumns: ['id', 'status', 'totalAmount', 'createdAt'],
    group: 'Sales',
    useAsTitle: 'id',
  },
  access: {
    read: adminOrOrderOwner,
    update: adminOrOrderOwner,
    delete: adminOrOrderOwner,
    create: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'orderedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      dbName: 'user_id',
      admin: {
        description: 'Customer who placed the order',
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      dbName: 'total_amount',
      admin: {
        description: 'Total order amount',
      },
    },
    {
      name: 'status',
      type: 'select',
      dbName: 'status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'items',
      type: 'array',
      dbName: 'order_items',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          dbName: 'product_id',
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          admin: {
            description: 'Price at time of order',
          },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
      ],
      required: true,
    },
    {
      name: 'shipping_name',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
      dbName: 'shipping_name',
    },
    {
      name: 'shipping_address',
      type: 'textarea',
      required: true,
      admin: {
        position: 'sidebar',
      },
      dbName: 'shipping_address',
    },
    {
      name: 'shipping_phone',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
      dbName: 'shipping_phone',
    },
    {
      name: 'address',
      type: 'relationship',
      relationTo: 'addresses',
      dbName: 'address_id',
      admin: {
        position: 'sidebar',
        description: 'Linked address record',
      },
    },
  ],
})