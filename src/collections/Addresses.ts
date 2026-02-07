import { addressAdminReadOnlyAccess } from '@/access/addressAdminReadOnlyAccess'
import type { CollectionConfig } from 'payload'
import {
  ensureUniqueDefaultAddress,
  preventDeletionIfReferenced,
  validateAddressData
} from './Addresses/hooks'

/**
 * Addresses collection - Strict schema match with Supabase 'addresses' table
 * DB columns: id, user_id, label, recipient_name, phone, address_line, city, postal_code, is_default, created_at, updated_at
 *
 * Best practice: Customer-owned data. Admin is read-only (view for support/order management).
 * Customers manage addresses via React Native frontend. Supabase RLS enforces user_id = auth.uid() for mobile app.
 */
export const Addresses: CollectionConfig = {
  slug: 'addresses',
  dbName: 'addresses',
  lockDocuments: false,
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'recipient_name', 'city', 'is_default'],
    group: 'Users',
    description: 'Read-only. Customers manage addresses in the mobile app.',
  },
  access: addressAdminReadOnlyAccess,
  hooks: {
    beforeValidate: [validateAddressData],
    beforeChange: [ensureUniqueDefaultAddress],
    beforeDelete: [preventDeletionIfReferenced],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      dbName: 'user_id', // Maps to Supabase addresses.user_id
      admin: {
        condition: ({ req }) => req?.user?.role === 'admin',
      },
      hooks: {
        beforeChange: [
          ({ req, value }) => {
            // Auto-assign current user if not admin (when req context exists)
            if (req?.user && req.user.role !== 'admin') {
              return req.user.id
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