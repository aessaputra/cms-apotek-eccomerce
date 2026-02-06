import type { Cart } from '@/payload-types'
import { productCaching } from '@/utilities/caching'
import { invalidateStockCache } from '@/utilities/stockAvailability'
import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

/**
 * Updates cart items when inventory stock levels change
 * Invalidates relevant caches when inventory changes
 * 
 * Simplified for schema: uses quantity field only (no reserved_quantity or expiry_date)
 */
export const updateCartsOnStockChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  previousDoc,
  context,
}) => {
  try {
    // Skip if explicitly disabled in context
    if (context.skipCartUpdates) {
      return doc
    }

    const productId = typeof doc.product === 'object' ? doc.product.id : doc.product

    if (!productId) {
      return doc
    }

    // Invalidate caches for this product when inventory changes
    if (operation === 'update' || operation === 'create') {
      invalidateStockCache(productId)
      productCaching.invalidateProduct(String(productId))
      req.payload.logger.debug(`Invalidated caches for product ${productId} due to inventory change`)
    }

    // Only handle updates that affect stock availability
    if (operation !== 'update') {
      return doc
    }

    // Calculate stock changes
    const previousQuantity = previousDoc?.quantity || 0
    const currentQuantity = doc.quantity || 0

    // Check if stock became unavailable or significantly reduced
    const stockReduced = currentQuantity < previousQuantity
    const stockBecameUnavailable = previousQuantity > 0 && currentQuantity === 0

    if (stockReduced || stockBecameUnavailable) {
      req.payload.logger.info(
        `Stock change detected for product ${productId}: ${previousQuantity} → ${currentQuantity}`
      )

      // Get all carts that contain this product
      // Note: Carts collection structure depends on ecommerce plugin; skip if not available
      let cartsWithProduct: { docs: Cart[] } = { docs: [] }
      try {
        cartsWithProduct = await req.payload.find({
          collection: 'carts',
          where: {
            'items.product': { equals: productId },
          },
          limit: 1000,
          req,
        })
      } catch (err) {
        req.payload.logger.warn(
          `Could not query carts for product ${productId} (carts schema may differ): ${err instanceof Error ? err.message : String(err)}`
        )
        return doc
      }

      req.payload.logger.info(`Found ${cartsWithProduct.docs.length} carts containing product ${productId}`)

      // Update each cart that contains this product
      for (const cart of cartsWithProduct.docs) {
        await updateCartForStockChange(req, cart, productId, currentQuantity)
      }
    }

    return doc

  } catch (error) {
    req.payload.logger.error(`Error updating carts on stock change: ${error instanceof Error ? error.message : String(error)}`)
    return doc
  }
}

/**
 * Update a specific cart when stock changes for a product
 */
async function updateCartForStockChange(
  req: PayloadRequest,
  cart: Cart,
  productId: string | number,
  availableStock: number
) {
  try {
    if (!cart.items) return

    let cartNeedsUpdate = false
    const updatedItems = []

    for (const item of cart.items) {
      if (!item.product) {
        updatedItems.push(item)
        continue
      }

      const itemProductId = typeof item.product === 'object' ? item.product.id : item.product

      if (itemProductId === productId) {
        const currentQuantity = item.quantity || 0

        if (currentQuantity > availableStock) {
          // Reduce quantity to available stock
          const newQuantity = Math.max(0, availableStock)

          if (newQuantity === 0) {
            req.payload.logger.info(`Removing out-of-stock product ${productId} from cart ${cart.id}`)
            cartNeedsUpdate = true
            continue // Don't add this item (effectively removing it)
          } else {
            req.payload.logger.info(
              `Reducing quantity for product ${productId} in cart ${cart.id}: ${currentQuantity} → ${newQuantity}`
            )
            updatedItems.push({
              ...item,
              quantity: newQuantity,
            })
            cartNeedsUpdate = true
          }
        } else {
          // No change needed for this item
          updatedItems.push(item)
        }
      } else {
        // Different product, no change needed
        updatedItems.push(item)
      }
    }

    // Update the cart if changes were made
    if (cartNeedsUpdate) {
      await req.payload.update({
        collection: 'carts',
        id: cart.id,
        data: {
          items: updatedItems,
        },
        context: {
          skipStockValidation: true,
          skipOversellingValidation: true,
          skipCartUpdates: true, // Prevent infinite loops
        },
        req,
      })

      req.payload.logger.info(`Updated cart ${cart.id} due to stock changes for product ${productId}`)
    }

  } catch (error) {
    req.payload.logger.error(
      `Error updating cart ${cart.id} for product ${productId}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}