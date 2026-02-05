import { adminOrCustomerOwner } from '@/access/adminOrCustomerOwner'
import type { CollectionConfig } from 'payload'
import {
  ensureUniqueDefaultAddress,
  preventDeletionIfReferenced,
  validateAddressData
} from './Addresses/hooks'

export const Addresses: CollectionConfig = {
  slug: 'addresses',
  dbName: 'addresses',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'customer', 'addressType', 'isDefaultShipping', 'isDefaultBilling'],
    group: 'E-commerce',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  hooks: {
    beforeValidate: [validateAddressData],
    beforeChange: [ensureUniqueDefaultAddress],
    beforeDelete: [preventDeletionIfReferenced],
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        condition: ({ req }) => req.user?.role === 'admin',
      },
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            // Auto-assign current user if not admin
            if (req.user?.role !== 'admin') {
              return req.user?.id
            }
            return value
          },
        ],
      },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'A friendly name for this address (e.g., "Home", "Office", "Mom\'s House")',
      },
    },
    {
      name: 'title',
      type: 'select',
      options: [
        { label: 'Mr.', value: 'mr' },
        { label: 'Mrs.', value: 'mrs' },
        { label: 'Ms.', value: 'ms' },
        { label: 'Dr.', value: 'dr' },
        { label: 'Prof.', value: 'prof' },
      ],
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'company',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'addressLine1',
      type: 'text',
      required: true,
      label: 'Address Line 1',
    },
    {
      name: 'addressLine2',
      type: 'text',
      label: 'Address Line 2',
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'state',
      type: 'text',
      required: true,
    },
    {
      name: 'postalCode',
      type: 'text',
      required: true,
    },
    {
      name: 'country',
      type: 'text',
      required: true,
      defaultValue: 'Indonesia',
    },
    {
      name: 'addressType',
      type: 'select',
      required: true,
      defaultValue: 'both',
      options: [
        { label: 'Shipping Only', value: 'shipping' },
        { label: 'Billing Only', value: 'billing' },
        { label: 'Both Shipping and Billing', value: 'both' },
      ],
      admin: {
        description: 'Specify whether this address can be used for shipping, billing, or both',
      },
    },
    {
      name: 'isDefaultShipping',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Set as default shipping address',
        condition: (data) => data.addressType === 'shipping' || data.addressType === 'both',
      },
    },
    {
      name: 'isDefaultBilling',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Set as default billing address',
        condition: (data) => data.addressType === 'billing' || data.addressType === 'both',
      },
    },
    {
      name: 'deliveryInstructions',
      type: 'textarea',
      admin: {
        description: 'Special delivery instructions (e.g., "Leave at front door", "Ring doorbell twice")',
        condition: (data) => data.addressType === 'shipping' || data.addressType === 'both',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Inactive addresses are hidden from selection but preserved for order history',
      },
    },
  ],
  timestamps: true,
}