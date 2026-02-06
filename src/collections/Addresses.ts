import { adminOrCustomerOwner } from '@/access/adminOrCustomerOwner'
import type { CollectionConfig } from 'payload'
import {
  ensureUniqueDefaultAddress,
  preventDeletionIfReferenced,
  validateAddressData
} from './Addresses/hooks'

/**
 * Addresses collection - Strict schema match with Supabase 'addresses' table
 * DB columns: id, user_id, label, recipient_name, phone, address_line, city, postal_code, is_default, created_at, updated_at
 */
export const Addresses: CollectionConfig = {
  slug: 'addresses',
  dbName: 'addresses',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'recipient_name', 'city', 'is_default'],
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
      // Note: This maps to user_id in DB via the ecommerce plugin
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
      defaultValue: 'Home',
      admin: {
        description: 'A friendly name for this address (e.g., "Home", "Office")',
      },
    },
    {
      name: 'recipient_name',
      type: 'text',
      required: true,
      admin: {
        description: 'Full name of the recipient',
      },
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        description: 'Contact phone number for delivery',
      },
    },
    {
      name: 'address_line',
      type: 'text',
      required: true,
      admin: {
        description: 'Full street address',
      },
    },
    {
      name: 'city',
      type: 'text',
      admin: {
        description: 'City name',
      },
    },
    {
      name: 'postal_code',
      type: 'text',
      admin: {
        description: 'Postal/ZIP code',
      },
    },
    {
      name: 'is_default',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Set as the default address for this customer',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}