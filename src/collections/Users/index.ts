import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { checkRole } from '@/access/utilities'

/**
 * Users (profiles) - Customer data only. No Payload auth.
 * Customers authenticate via Customer App (Supabase Auth).
 * Admin Panel login uses Admins collection.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  dbName: 'profiles', // Strict mapping to Supabase 'profiles' table
  lockDocuments: false,
  access: {
    admin: ({ req: { user } }) => checkRole(['admin'], user),
    create: adminOnly, // Customers created via Supabase Auth sync; admin can add manually
    delete: adminOnly,
    read: adminOrSelf,
    update: adminOrSelf,
  },
  admin: {
    group: 'Users',
    defaultColumns: ['full_name', 'email', 'role'],
    useAsTitle: 'full_name',
    description: 'Customer profiles. Managed via Supabase Auth in mobile app. View/manage from Admin Panel.',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      admin: {
        description: 'Customer email (synced from Supabase Auth)',
      },
    },
    {
      name: 'full_name', // Matches schema 'full_name'
      label: 'Full Name',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      admin: {
        description: 'Primary phone number for order notifications',
      },
      validate: (value: string | null | undefined) => {
        if (!value) {
          return 'Phone number is required'
        }
        if (!/^\+?[\d\s\-\(\)]+$/.test(value)) {
          return 'Please enter a valid phone number'
        }
        // Ensure minimum length for valid phone numbers
        const digitsOnly = value.replace(/\D/g, '')
        if (digitsOnly.length < 10) {
          return 'Phone number must contain at least 10 digits'
        }
        return true
      },
    },
    {
      name: 'role', // Matches schema 'role' - always 'customer' for this collection
      type: 'select',
      access: {
        create: adminOnlyFieldAccess,
        read: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        description: 'Always customer. Staff use Admins collection.',
        readOnly: true,
      },
      defaultValue: 'customer',
      options: [
        {
          label: 'Customer',
          value: 'customer',
        },
      ],
      required: true,
      saveToJWT: true,
    },
    {
      name: 'orders',
      type: 'join',
      collection: 'orders',
      on: 'orderedBy', // Matches 'orderedBy' field in Orders collection
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    {
      name: 'cart_items',
      type: 'join',
      collection: 'cart-items',
      on: 'user', // Renamed to 'user' in CartItems collection
      admin: {
        allowCreate: true,
        defaultColumns: ['product_id', 'quantity'],
      },
    },
    {
      name: 'addresses',
      type: 'join',
      collection: 'addresses',
      on: 'user',
      admin: {
        allowCreate: false,
        defaultColumns: ['label', 'recipient_name', 'city', 'is_default'],
        description: 'Addresses for this customer (read-only, managed in mobile app). View in User edit to see which addresses belong to this user.',
      },
    },
  ],
}
