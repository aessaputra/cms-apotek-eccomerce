import { adminOrCustomerOwner } from '@/access/adminOrCustomerOwner'
import { preventOverselling } from '@/collections/Cart/hooks/preventOverselling'
import { updateStockReservations } from '@/collections/Cart/hooks/updateStockReservations'
import { validateStockOnCartChange } from '@/collections/Cart/hooks/validateStockOnCartChange'
import type { Plugin } from 'payload'

/**
 * Plugin to enhance the cart collection with stock validation and proper access control
 * This plugin adds hooks to validate stock availability when cart operations occur
 * and ensures proper user isolation for cart data
 * 
 * Requirements: 4.1, 4.2, 4.4, 4.5, 7.1, 7.2 - Stock validation, cart-inventory integration, and access control
 */
export const enhanceCartPlugin = (): Plugin => {
  return (config) => {
    return {
      ...config,
      collections: config.collections?.map((collection) => {
        // Enhance the carts collection
        if (collection.slug === 'carts') {
          return {
            ...collection,
            access: {
              ...collection.access,
              // Ensure proper access control for carts
              // Admins can access all carts, customers can only access their own
              read: adminOrCustomerOwner,
              update: adminOrCustomerOwner,
              delete: adminOrCustomerOwner,
            },
            hooks: {
              ...collection.hooks,
              beforeChange: [
                ...(collection.hooks?.beforeChange || []),
                validateStockOnCartChange,
                preventOverselling,
              ],
              afterChange: [
                ...(collection.hooks?.afterChange || []),
                updateStockReservations,
              ],
            },
          }
        }
        return collection
      }),
    }
  }
}