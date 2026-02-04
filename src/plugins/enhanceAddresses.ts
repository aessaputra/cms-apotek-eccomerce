import { adminOrCustomerOwner } from '@/access/adminOrCustomerOwner'
import {
  ensureUniqueDefaultAddress,
  preventDeletionIfReferenced,
  validateAddressData
} from '@/collections/Addresses/hooks'
import type { Config, Plugin } from 'payload'

/**
 * Plugin to enhance the e-commerce plugin's addresses collection
 * with pharmacy-specific features
 */
export const enhanceAddressesPlugin = (): Plugin => (config: Config): Config => {
  return {
    ...config,
    collections: config.collections?.map((collection) => {
      if (collection.slug === 'addresses') {
        return {
          ...collection,
          admin: {
            ...collection.admin,
            useAsTitle: 'label',
            defaultColumns: ['label', 'customer', 'addressType', 'isDefaultShipping', 'isDefaultBilling'],
            group: 'E-commerce',
          },
          access: {
            ...collection.access,
            read: adminOrCustomerOwner,
            update: adminOrCustomerOwner,
            delete: adminOrCustomerOwner,
          },
          hooks: {
            ...collection.hooks,
            beforeValidate: [
              ...(collection.hooks?.beforeValidate || []),
              validateAddressData,
            ],
            beforeChange: [
              ...(collection.hooks?.beforeChange || []),
              ensureUniqueDefaultAddress,
            ],
            beforeDelete: [
              ...(collection.hooks?.beforeDelete || []),
              preventDeletionIfReferenced,
            ],
          },
          fields: [
            // Extend existing fields with new pharmacy-specific fields
            ...collection.fields,
            // Add new pharmacy-specific fields
            {
              name: 'label',
              type: 'text',
              required: true,
              admin: {
                description: 'A friendly name for this address (e.g., "Home", "Office", "Mom\'s House")',
              },
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
        }
      }
      return collection
    }),
  }
}