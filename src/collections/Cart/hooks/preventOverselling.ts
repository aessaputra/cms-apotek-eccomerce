import type { Cart } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Prevents overselling by validating total demand across all carts
 * This hook ensures that the sum of all cart reservations doesn't exceed available stock
 * 
 * Requirements: 4.2, 4.4, 4.5 - Prevent overselling through cart operations
 */
export const preventOverselling: CollectionBeforeChangeHook<Cart> = async ({
  data,
  req,
  operation,
  originalDoc,
  context,
}) => {
  try {
    // Skip validation if explicitly disabled in context
    if (context.skipOversellingValidation) {
      return data
    }

    // Only validate on create and update operations
    if (operation !== 'create' && operation !== 'update') {
      return data
    }

    const cartItems = data.items || []

    if (cartItems.length === 0) {
      return data
    }

    req.payload.logger.info(`Checking for overselling across all carts`)

    // Check each cart item against total system demand
    for (const item of cartItems) {
      if (!item.product) continue

      const productId = typeof item.product === 'object' ? item.product.id : item.product
      const requestedQuantity = item.quantity || 0

      if (!productId || requestedQuantity <= 0) {
        continue
      }

      // Get total demand across all active carts (excluding this cart)
      const totalDemand = await getTotalCartDemand(req, productId, data.id)

      // Get available stock
      const availableStock = await getAvailableStock(req, productId)

      // Calculate what would be the new total demand if this cart is updated
      const currentCartDemand = await getCurrentCartDemand(req, productId, data.id)
      const newTotalDemand = totalDemand - currentCartDemand + requestedQuantity

      if (newTotalDemand > availableStock) {
        const productName = await getProductName(req, productId)
        const excessDemand = newTotalDemand - availableStock

        throw new Error(
          `Cannot add ${requestedQuantity} units of ${productName} to cart. ` +
          `This would create total demand of ${newTotalDemand} units, ` +
          `but only ${availableStock} units are available. ` +
          `Reduce quantity by at least ${excessDemand} units.`
        )
      }
    }

    req.payload.logger.info('Overselling validation passed for all cart items')
    return data

  } catch (error) {
    req.payload.logger.error(`Overselling validation failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Get total demand for a product across all active carts (excluding specified cart)
 */
async function getTotalCartDemand(req: any, productId: string | number, excludeCartId?: string | number): Promise<number> {
  try {
    const whereClause: any = {
      'items.product': { equals: productId },
    }

    // Exclude the current cart from the calculation
    if (excludeCartId) {
      whereClause.id = { not_equals: excludeCartId }
    }

    const cartsResult = await req.payload.find({
      collection: 'carts',
      where: whereClause,
      limit: 1000, // Get all matching carts
      req,
    })

    let totalDemand = 0

    for (const cart of cartsResult.docs) {
      if (cart.items) {
        for (const item of cart.items) {
          if (!item.product) continue

          const itemProductId = typeof item.product === 'object' ? item.product.id : item.product
          if (itemProductId === productId) {
            totalDemand += item.quantity || 0
          }
        }
      }
    }

    return totalDemand
  } catch (error) {
    req.payload.logger.error(`Error getting total cart demand for product ${productId}: ${error instanceof Error ? error.message : String(error)}`)
    return 0
  }
}

/**
 * Get current cart's demand for a product
 */
async function getCurrentCartDemand(req: any, productId: string | number, cartId?: string | number): Promise<number> {
  try {
    if (!cartId) return 0

    const cart = await req.payload.findByID({
      collection: 'carts',
      id: cartId,
      req,
    })

    if (!cart || !cart.items) return 0

    let currentDemand = 0
    for (const item of cart.items) {
      if (!item.product) continue

      const itemProductId = typeof item.product === 'object' ? item.product.id : item.product
      if (itemProductId === productId) {
        currentDemand += item.quantity || 0
      }
    }

    return currentDemand
  } catch (error) {
    req.payload.logger.error(`Error getting current cart demand: ${error instanceof Error ? error.message : String(error)}`)
    return 0
  }
}

/**
 * Get available stock for a product
 */
async function getAvailableStock(req: any, productId: string | number): Promise<number> {
  try {
    // Query inventory for the product
    const inventoryResult = await req.payload.find({
      collection: 'inventory',
      where: {
        product: { equals: productId },
      },
      limit: 1,
      req,
    })

    let totalAvailable = 0
    if (inventoryResult.docs.length > 0) {
      const inventory = inventoryResult.docs[0]
      totalAvailable = inventory.quantity || 0
    }

    return totalAvailable
  } catch (error) {
    req.payload.logger.error(`Error getting available stock for product ${productId}: ${error instanceof Error ? error.message : String(error)}`)
    return 0
  }
}

/**
 * Get product name for error messages
 */
async function getProductName(req: any, productId: string | number): Promise<string> {
  try {
    const product = await req.payload.findByID({
      collection: 'products',
      id: productId,
      req,
    })
    return product?.title || `Product ${productId}`
  } catch (error) {
    return `Product ${productId}`
  }
}