import type { Order } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Hook to validate stock availability before order confirmation
 * Prevents orders from being confirmed if insufficient stock is available
 */
export const validateStockAvailability: CollectionBeforeChangeHook<Order> = async ({
  data,
  req,
  operation: _operation, // operation is not used, so it's prefixed with _
  originalDoc,
  context,
}) => {
  const { payload } = req

  try {
    // Only validate stock when order status is being changed to 'confirmed' or 'processing'
    const statusRequiringValidation = ['confirmed', 'processing']
    const newStatus = data?.status
    const oldStatus = originalDoc?.status

    // Skip validation if status isn't changing to one that requires stock validation
    if (!newStatus || !statusRequiringValidation.includes(newStatus)) {
      return data
    }

    // Skip if status was already confirmed/processing (avoid re-validation)
    if (oldStatus && statusRequiringValidation.includes(oldStatus)) {
      return data
    }

    // Skip if no items in the order
    if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
      return data
    }

    const stockValidationErrors: string[] = []
    const stockReservations: Array<{
      inventoryId: string
      productName: string
      requestedQuantity: number
      availableQuantity: number
    }> = []

    // Validate stock availability for each item
    for (const item of data.items) {
      if (item && typeof item === 'object' && 'product' in item && 'quantity' in item) {
        const productId = typeof item.product === 'object' && item.product !== null
          ? (typeof item.product.id === 'string' ? item.product.id : String(item.product.id))
          : String(item.product)
        const requestedQuantity = item.quantity || 0

        if (productId && requestedQuantity > 0) {
          // Get product details
          const product = await payload.findByID({
            collection: 'products',
            id: productId,
            req,
            overrideAccess: false,
          })

          if (!product) {
            stockValidationErrors.push(`Product not found: ${productId}`)
            continue
          }

          // Get available inventory for this product
          // Simplified 1:1 inventory check
          const inventoryResult = await payload.find({
            collection: 'inventory',
            where: {
              product: { equals: productId },
            },
            limit: 1,
            req,
            overrideAccess: false,
          })

          let totalAvailable = 0

          if (inventoryResult.docs.length > 0) {
            const inventory = inventoryResult.docs[0]
            totalAvailable = inventory.quantity || 0
          }

          // Check if we have enough stock
          if (totalAvailable < requestedQuantity) {
            stockValidationErrors.push(
              `Insufficient stock for "${product.title}": requested ${requestedQuantity}, available ${totalAvailable}`
            )
          } else {
            // Store successful validation for potential reservation
            // inventoryId is technically simplified here as we just use product ID to find it,
            // but effectively we can use inventory ID if found.
            const inventoryId = String(inventoryResult.docs.length > 0 ? inventoryResult.docs[0].id : productId)

            stockReservations.push({
              inventoryId: inventoryId,
              productName: product.title || productId,
              requestedQuantity,
              availableQuantity: totalAvailable,
            })
          }
        }
      }
    }

    // If there are stock validation errors, prevent the order from being confirmed
    if (stockValidationErrors.length > 0) {
      throw new Error(
        `Cannot confirm order due to stock availability issues:\n${stockValidationErrors.join('\n')}`
      )
    }

    // Store successful stock validation in context for use by other hooks
    context.stockValidated = true
    context.stockReservations = stockReservations

    return data
  } catch (error) {
    // Re-throw the error to prevent the operation from completing
    throw error
  }
}