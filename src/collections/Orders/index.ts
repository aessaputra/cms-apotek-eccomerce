import { adminOrCustomerOwner } from '@/access/adminOrCustomerOwner'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import {
    checkPrescriptionRequirements,
    deductStockOnConfirmation,
    restoreStockOnCancellation,
    validateStockAvailability,
} from './hooks'

export const OrdersCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection?.admin,
    defaultColumns: [
      'id',
      'customer',
      'total',
      'status',
      'prescription_required',
      'prescription_verified',
      'createdAt'
    ],
    useAsTitle: 'id',
  },
  access: {
    ...defaultCollection?.access,
    // Ensure proper access control for orders
    // Admins can access all orders, customers can only access their own
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  fields: [
    ...defaultCollection.fields,
    {
      name: 'prescription_required',
      type: 'checkbox',
      defaultValue: false,
      index: true, // Index for prescription order filtering
      admin: {
        description: 'Indicates if this order contains prescription items',
        position: 'sidebar',
        readOnly: true, // This will be set automatically based on products
      },
    },
    {
      name: 'prescription_verified',
      type: 'checkbox',
      defaultValue: false,
      index: true, // Index for verification status filtering
      admin: {
        description: 'Indicates if prescription has been verified by an admin',
        position: 'sidebar',
        condition: (data) => data?.prescription_required === true,
      },
      access: {
        update: ({ req: { user } }) => {
          // Only admins can verify prescriptions
          return user?.roles?.includes('admin') || false
        },
      },
    },
    {
      name: 'verified_by',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin user who verified the prescription',
        position: 'sidebar',
        condition: (data) => data?.prescription_verified === true,
      },
      access: {
        update: ({ req: { user } }) => {
          // Only admins can set who verified
          return user?.roles?.includes('admin') || false
        },
      },
      filterOptions: {
        roles: {
          contains: 'admin',
        },
      },
    },
    {
      name: 'prescription_notes',
      type: 'textarea',
      admin: {
        description: 'Notes about prescription verification or special instructions',
        position: 'sidebar',
        condition: (data) => data?.prescription_required === true,
      },
      access: {
        update: ({ req: { user } }) => {
          // Only admins can add prescription notes
          return user?.roles?.includes('admin') || false
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      checkPrescriptionRequirements,
      validateStockAvailability,
    ],
    afterChange: [
      deductStockOnConfirmation,
      restoreStockOnCancellation,
    ],
  },
})