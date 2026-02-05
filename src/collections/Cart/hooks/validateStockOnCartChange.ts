import type { Cart } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Validates stock availability when cart items are added or modified
 * This hook prevents adding items to cart when insufficient stock is available
 * 
 * Requirements: 4.1, 4.5 - Stock validation for cart operations
 */
export const validateStockOnCartChange: CollectionBeforeChangeHook<Cart> = async ({
  data,
  req,
  operation,
  originalDoc,
  context,
}) => {
  try {
    // Skip validation if explicitly disabled in context
    if (context.skipStockValidation) {
      return data
    }

    // Only validate on create and update operations
    if (operation !== 'create' && operation !== 'update') {
      return data
    }

    // Get cart items from the data
    const cartItems = data.items || []

    if (cartItems.length === 0) {
      return data
    }

    req.payload.logger.info(`Validating stock for ${cartItems.length} cart items`)

    // Validate each cart item
    for (const item of cartItems) {
      if (!item.product) continue

      const productId = typeof item.product === 'object' ? item.product.id : item.product
      const requestedQuantity = item.quantity || 0

      if (!productId || requestedQuantity <= 0) {
        continue
      }

      // Get available stock for the product
      const availableStock = await getAvailableStock(req, productId)

      // Check if we have enough stock
      if (requestedQuantity > availableStock) {
        const productName = await getProductName(req, productId)
        throw new Error(
          `Insufficient stock for ${productName}. Requested: ${requestedQuantity}, Available: ${availableStock}`
        )
      }

      // For updates, check if we're increasing quantity
      if (operation === 'update' && originalDoc) {
        const originalItem = originalDoc.items?.find((origItem) => {
          if (!origItem.product) return false
          const origProductId = typeof origItem.product === 'object' ? origItem.product.id : origItem.product
          return origProductId === productId
        })

        const originalQuantity = originalItem?.quantity || 0
        const quantityIncrease = requestedQuantity - originalQuantity

        if (quantityIncrease > 0 && quantityIncrease > availableStock) {
          const productName = await getProductName(req, productId)
          // Available stock is total stock.
          // If we are strictly 1:1, availableStock is what's in the DB.
          // If user already has some in cart, effectively we are validating the NEW total quantity against available.
          // But availableStock query returns current DB quantity.
          // Is DB quantity reduced when added to cart? NO.
          // So availableStock is total on hand.
          // So requestedQuantity > availableStock is the correct check.
          // The logic below checking "quantityIncrease > availableStock" is slightly weird if availableStock is total.
          // It might imply availableStock is "remaining unallocated". But since we removed reservation, availableStock is just total inventory.
          // So simple check `requestedQuantity > availableStock` is enough as it covers the total need.

          // However, let's keep the error message consistent if logic was intended to be "incremental check".
          // But with no reservation, incremental check is less relevant than absolute total check.
          // The first check `requestedQuantity > availableStock` handles it.

          // I'll leave the error message logic but simplified logic is already applied.
        }
      }
    }

    req.payload.logger.info('Stock validation passed for all cart items')
    return data

  } catch (error) {
    req.payload.logger.error(`Stock validation failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
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
      select: {
        title: true, // simplified from name to title as per schema or assumption, let's check product type if possible. Usually title.
      },
      req,
    })
    // schema says title? In verify products step I saw title.
    return product?.title || `Product ${productId}`
  } catch (error) {
    return `Product ${productId}`
  }
}