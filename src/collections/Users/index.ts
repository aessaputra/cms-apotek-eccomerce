import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { publicAccess } from '@/access/publicAccess'
import { checkRole } from '@/access/utilities'

import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  dbName: 'profiles', // Strict mapping to Supabase 'profiles' table
  access: {
    admin: ({ req: { user } }) => checkRole(['admin'], user),
    create: publicAccess,
    delete: adminOnly,
    read: adminOrSelf,
    update: adminOrSelf,
  },
  admin: {
    group: 'Users',
    defaultColumns: ['full_name', 'email', 'role'],
    useAsTitle: 'full_name',
  },
  auth: {
    tokenExpiration: 1209600,
  },
  // Note: is_active field removed to match DB schema (profiles table has no is_active column)
  fields: [
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
      name: 'role', // Matches schema 'role' text
      type: 'select',
      access: {
        create: adminOnlyFieldAccess,
        read: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      defaultValue: 'customer',
      // hasMany: true, // Schema says 'role text', single value.
      hooks: {
        beforeChange: [ensureFirstUserIsAdmin],
      },
      options: [
        {
          label: 'admin',
          value: 'admin',
        },
        {
          label: 'customer',
          value: 'customer',
        },
      ],
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
        defaultColumns: ['id'],
      },
    },
  ],
}
