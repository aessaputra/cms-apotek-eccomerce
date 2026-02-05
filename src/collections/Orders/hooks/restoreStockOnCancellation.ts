import type { Order } from '@/payload-types'
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Hook to restore stock quantities when order is cancelled
 * Simplified for 1:1 product-inventory relationship
 */
export const restoreStockOnCancellation: CollectionAfterChangeHook<Order> = async ({
  doc,
  req,
  operation: _operation,
  previousDoc,
  context: _context,
}) => {
  const { payload } = req

  try {
    // Only process when order status changes to 'cancelled'
    const newStatus = doc?.status
    const oldStatus = previousDoc?.status

    // Skip if status isn't changing to cancelled
    if (newStatus !== 'cancelled') {
      return doc
    }

    // Skip if order was already cancelled (avoid double restoration)
    if (oldStatus === 'cancelled') {
      return doc
    }

    // Only restore stock if the order was previously confirmed/processing
    const statusesWithStockDeducted = ['confirmed', 'processing', 'shipped']
    if (!oldStatus || !statusesWithStockDeducted.includes(oldStatus)) {
      return doc
    }

    // Skip if no items in the order
    if (!doc?.items || !Array.isArray(doc.items) || doc.items.length === 0) {
      return doc
    }

    let totalRestorations = 0

    // Process each item to restore stock
    for (const item of doc.items) {
      if (item && typeof item === 'object' && 'product' in item && 'quantity' in item) {
        const productId = typeof item.product === 'object' && item.product !== null
          ? (typeof item.product.id === 'string' ? item.product.id : String(item.product.id))
          : String(item.product)
        const quantityToRestore = item.quantity || 0

        if (productId && quantityToRestore > 0) {
          // Get inventory for this product (1:1 relationship)
          const inventoryResult = await payload.find({
            collection: 'inventory',
            where: {
              product: { equals: productId },
            },
            limit: 1,
            req,
            overrideAccess: true,
          })

          if (inventoryResult.docs.length === 0) {
            payload.logger.warn(`Order ${doc.id}: No inventory found for product ${productId}`)
            continue
          }

          const inventory = inventoryResult.docs[0]
          const currentQuantity = inventory.quantity || 0
          const newQuantity = currentQuantity + quantityToRestore

          // Update inventory quantity
          await payload.update({
            collection: 'inventory',
            id: inventory.id,
            data: {
              quantity: newQuantity,
            },
            req,
            overrideAccess: true,
            context: { skipHooks: true },
          })

          payload.logger.info(
            `Order ${doc.id}: Restored ${quantityToRestore} to product ${productId} (${currentQuantity} → ${newQuantity})`
          )

          totalRestorations++
        }
      }
    }

    payload.logger.info(`Order ${doc.id}: Stock restoration completed. ${totalRestorations} products updated.`)

    return doc
  } catch (error) {
    payload.logger.error(`Order ${doc.id}: Stock restoration failed: ${error}`)
    return doc
  }
}