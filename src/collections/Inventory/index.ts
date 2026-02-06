import { inventoryAdminAccess } from '@/access/inventoryAdminAccess'
import type { CollectionConfig } from 'payload'
import { checkLowStockLevels, updateCartsOnStockChange } from './hooks'

/**
 * Inventory Collection - Stock management per product (1:1 relationship)
 * 
 * Schema fields:
 * - product_id (uuid, FK, UNIQUE)
 * - quantity (integer, NOT NULL, default 0)
 * - low_stock_threshold (integer, default 10)
 * - updated_at (timestamptz)
 */
export const Inventory: CollectionConfig = {
  slug: 'inventory',
  dbName: 'inventory',
  lockDocuments: false,
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['product', 'quantity', 'low_stock_threshold', 'updated_at'],
    group: 'Pharmacy Management',
    description: 'Stock management per product',
  },
  access: {
    create: inventoryAdminAccess,
    read: inventoryAdminAccess,
    update: inventoryAdminAccess,
    delete: inventoryAdminAccess,
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      unique: true, // 1:1 relationship per schema
      admin: {
        description: 'The product this inventory belongs to (1:1 relationship)',
      },
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      index: true,
      admin: {
        description: 'Current available quantity',
        step: 1,
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined) {
          return 'Quantity is required'
        }
        if (value < 0) {
          return 'Quantity cannot be negative'
        }
        if (!Number.isInteger(value)) {
          return 'Quantity must be a whole number'
        }
        return true
      },
    },
    {
      name: 'low_stock_threshold',
      type: 'number',
      defaultValue: 10,
      min: 0,
      admin: {
        description: 'Minimum stock level before low stock alert',
        step: 1,
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined) {
          return true // Optional field with default
        }
        if (value < 0) {
          return 'Low stock threshold cannot be negative'
        }
        if (!Number.isInteger(value)) {
          return 'Low stock threshold must be a whole number'
        }
        return true
      },
    },
    {
      name: 'updated_at',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  timestamps: false,
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (!data) return data

        // Log inventory changes for audit purposes
        if (operation === 'update' && originalDoc && data.quantity !== originalDoc.quantity) {
          req.payload.logger.info(
            `Inventory quantity changed for product ${data.product}: ${originalDoc.quantity} → ${data.quantity}`
          )
        }

        return data
      },
    ],
    afterChange: [
      updateCartsOnStockChange,
      async ({ doc, operation, req, context }) => {
        // Skip if this is triggered by our own hook to prevent loops
        if (context?.skipInventoryHooks) return doc

        // Log new inventory creation
        if (operation === 'create') {
          req.payload.logger.info(
            `New inventory created for product ${doc.product} (Qty: ${doc.quantity})`
          )
        }

        return doc
      },
    ],
    afterRead: [
      checkLowStockLevels,
    ],
  },
}