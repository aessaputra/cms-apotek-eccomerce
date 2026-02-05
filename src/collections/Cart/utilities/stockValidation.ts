import type { Payload } from 'payload'

/**
 * Utility functions for cart stock validation
 * These functions provide real-time stock checking capabilities
 */

export interface StockCheckResult {
  available: number
  reserved: number // Still tracked in concept via Cart but underlying inventory doesn't store it
  total: number
  isAvailable: boolean
  // batches: Removed
}

/**
 * Check real-time stock availability for a product
 * Requirements: 4.1, 4.5 - Real-time stock validation
 */
export async function checkProductStock(
  payload: Payload,
  productId: string | number,
  requestedQuantity: number = 1
): Promise<StockCheckResult> {
  try {
    // Get inventory for the product (1:1 relationship now)
    const inventoryResult = await payload.find({
      collection: 'inventory',
      where: {
        product: { equals: productId },
      },
      limit: 1,
    })

    let totalAvailable = 0
    let totalStock = 0
    // Reserved quantity is no longer on Inventory collection. 
    // If we need to calculate "reserved" checks, we'd need to query active Carts.
    // For MVP, we can treat inventory.quantity as "Available to Promise" if we update it on Checkout.
    // Or if we want to support reservation in Cart, we need to query all Carts.
    // Let's assume for now quantity is the source of truth.
    const totalReserved = 0

    if (inventoryResult.docs.length > 0) {
      const inventory = inventoryResult.docs[0]
      const currentQuantity = inventory.quantity || 0
      totalStock = currentQuantity
      totalAvailable = currentQuantity
    }

    return {
      available: totalAvailable,
      reserved: totalReserved,
      total: totalStock,
      isAvailable: totalAvailable >= requestedQuantity,
    }

  } catch (error) {
    payload.logger.error(`Error checking stock for product ${productId}: ${error instanceof Error ? error.message : String(error)}`)

    return {
      available: 0,
      reserved: 0,
      total: 0,
      isAvailable: false,
    }
  }
}

/**
 * Validate multiple cart items at once
 * Requirements: 4.1, 4.5 - Bulk stock validation
 */
export async function validateCartItems(
  payload: Payload,
  items: Array<{ productId: string | number; quantity: number }>
): Promise<{
  valid: boolean
  errors: Array<{ productId: string | number; message: string }>
  stockInfo: Record<string | number, StockCheckResult>
}> {
  const errors: Array<{ productId: string | number; message: string }> = []
  const stockInfo: Record<string | number, StockCheckResult> = {}

  try {
    // Check each item
    for (const item of items) {
      const stockResult = await checkProductStock(payload, item.productId, item.quantity)
      stockInfo[item.productId] = stockResult

      if (!stockResult.isAvailable) {
        // Get product name for better error message
        try {
          const product = await payload.findByID({
            collection: 'products',
            id: item.productId,
          })

          errors.push({
            productId: item.productId,
            message: `Insufficient stock for ${product?.title || `Product ${item.productId}`}. Requested: ${item.quantity}, Available: ${stockResult.available}`,
          })
        } catch {
          errors.push({
            productId: item.productId,
            message: `Insufficient stock for Product ${item.productId}. Requested: ${item.quantity}, Available: ${stockResult.available}`,
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      stockInfo,
    }

  } catch (error) {
    payload.logger.error(`Error validating cart items: ${error instanceof Error ? error.message : String(error)}`)

    return {
      valid: false,
      errors: [{ productId: 'unknown', message: 'Stock validation failed due to system error' }],
      stockInfo,
    }
  }
}

/**
 * Check if a cart has any items with insufficient stock
 * Requirements: 4.1, 4.5 - Cart-wide stock validation
 */
export async function validateCartStock(
  payload: Payload,
  cartId: string | number
): Promise<{
  valid: boolean
  errors: Array<{ productId: string | number; message: string }>
  totalItems: number
  validItems: number
}> {
  try {
    // Get the cart
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 1,
    })

    if (!cart || !cart.items) {
      return {
        valid: true,
        errors: [],
        totalItems: 0,
        validItems: 0,
      }
    }

    // Convert cart items to validation format
    const itemsToValidate = cart.items
      .filter((item) => item.product && (item.quantity || 0) > 0)
      .map((item) => ({
        productId: typeof item.product === 'object' ? item.product!.id : item.product!,
        quantity: item.quantity || 0,
      }))

    const validation = await validateCartItems(payload, itemsToValidate)

    return {
      valid: validation.valid,
      errors: validation.errors,
      totalItems: itemsToValidate.length,
      validItems: itemsToValidate.length - validation.errors.length,
    }

  } catch (error) {
    payload.logger.error(`Error validating cart ${cartId}: ${error instanceof Error ? error.message : String(error)}`)

    return {
      valid: false,
      errors: [{ productId: 'unknown', message: 'Cart validation failed due to system error' }],
      totalItems: 0,
      validItems: 0,
    }
  }
}