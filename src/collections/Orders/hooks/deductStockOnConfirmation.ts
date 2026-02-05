import type { Order } from '@/payload-types'
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Hook to deduct stock quantities when order is confirmed
 * Simplified for 1:1 product-inventory relationship
 */
export const deductStockOnConfirmation: CollectionAfterChangeHook<Order> = async ({
  doc,
  req,
  operation: _operation,
  previousDoc,
  context,
}) => {
  const { payload } = req

  try {
    // Only process when order status changes to 'confirmed' or 'processing'
    const statusRequiringDeduction = ['confirmed', 'processing']
    const newStatus = doc?.status
    const oldStatus = previousDoc?.status

    // Skip if status isn't changing to one that requires stock deduction
    if (!newStatus || !statusRequiringDeduction.includes(newStatus)) {
      return doc
    }

    // Skip if status was already confirmed/processing (avoid double deduction)
    if (oldStatus && statusRequiringDeduction.includes(oldStatus)) {
      return doc
    }

    // Skip if stock wasn't validated (safety check)
    if (!context.stockValidated) {
      payload.logger.warn(`Order ${doc.id}: Stock deduction skipped - stock validation not confirmed`)
      return doc
    }

    // Skip if no items in the order
    if (!doc?.items || !Array.isArray(doc.items) || doc.items.length === 0) {
      return doc
    }

    let totalDeductions = 0

    // Process each item in the order
    for (const item of doc.items) {
      if (item && typeof item === 'object' && 'product' in item && 'quantity' in item) {
        const productId = typeof item.product === 'object' && item.product !== null
          ? (typeof item.product.id === 'string' ? item.product.id : String(item.product.id))
          : String(item.product)
        const quantityToDeduct = item.quantity || 0

        if (productId && quantityToDeduct > 0) {
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
          const newQuantity = Math.max(0, currentQuantity - quantityToDeduct)

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
            `Order ${doc.id}: Deducted ${quantityToDeduct} from product ${productId} (${currentQuantity} → ${newQuantity})`
          )

          totalDeductions++
        }
      }
    }

    payload.logger.info(`Order ${doc.id}: Stock deduction completed. ${totalDeductions} products updated.`)

    return doc
  } catch (error) {
    payload.logger.error(`Order ${doc.id}: Stock deduction failed: ${error}`)
    return doc
  }
}