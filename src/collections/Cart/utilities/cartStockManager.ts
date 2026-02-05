import type { Payload } from 'payload'

/**
 * Cart stock management utilities
 * These utilities provide comprehensive cart-inventory integration
 * 
 * Requirements: 4.2, 4.4, 4.5 - Cart-inventory integration utilities
 */

export interface CartStockStatus {
  cartId: string | number
  totalItems: number
  validItems: number
  invalidItems: number
  issues: Array<{
    productId: string | number
    productName: string
    requestedQuantity: number
    availableQuantity: number
    issue: 'insufficient_stock' | 'expired' | 'unavailable'
    suggestedAction: 'reduce_quantity' | 'remove_item' | 'contact_support'
  }>
  canProceedToCheckout: boolean
  lastChecked: string
}

/**
 * Comprehensive cart stock validation and status check
 */
export async function getCartStockStatus(
  payload: Payload,
  cartId: string | number
): Promise<CartStockStatus> {
  try {
    // Get the cart with populated product data
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 1,
    })

    if (!cart || !cart.items) {
      return {
        cartId,
        totalItems: 0,
        validItems: 0,
        invalidItems: 0,
        issues: [],
        canProceedToCheckout: true,
        lastChecked: new Date().toISOString(),
      }
    }

    const issues: CartStockStatus['issues'] = []
    let validItems = 0
    let invalidItems = 0

    // Check each cart item
    for (const item of cart.items) {
      if (!item.product) continue

      const productId = typeof item.product === 'object' ? item.product.id : item.product
      const productName = typeof item.product === 'object' ? item.product.title : `Product ${productId}`
      const requestedQuantity = item.quantity || 0

      if (requestedQuantity <= 0) continue

      // Get stock information for this product
      const stockInfo = await getProductStockInfo(payload, productId)

      if (stockInfo.totalAvailable === 0) {
        issues.push({
          productId,
          productName,
          requestedQuantity,
          availableQuantity: 0,
          issue: 'unavailable',
          suggestedAction: 'remove_item',
        })
        invalidItems++
      } else if (requestedQuantity > stockInfo.totalAvailable) {
        issues.push({
          productId,
          productName,
          requestedQuantity,
          availableQuantity: stockInfo.totalAvailable,
          issue: 'insufficient_stock',
          suggestedAction: 'reduce_quantity',
        })
        invalidItems++
      } else {
        validItems++
      }
    }

    return {
      cartId,
      totalItems: cart.items.length,
      validItems,
      invalidItems,
      issues,
      canProceedToCheckout: issues.length === 0,
      lastChecked: new Date().toISOString(),
    }

  } catch (error) {
    payload.logger.error(`Error getting cart stock status: ${error instanceof Error ? error.message : String(error)}`)

    return {
      cartId,
      totalItems: 0,
      validItems: 0,
      invalidItems: 0,
      issues: [{
        productId: 'unknown',
        productName: 'Unknown',
        requestedQuantity: 0,
        availableQuantity: 0,
        issue: 'unavailable',
        suggestedAction: 'contact_support'
      }],
      canProceedToCheckout: false,
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Auto-fix cart by adjusting quantities and removing unavailable items
 */
export async function autoFixCartStock(
  payload: Payload,
  cartId: string | number,
  options: {
    removeUnavailableItems?: boolean
    adjustQuantitiesToAvailable?: boolean
    preserveUserPreferences?: boolean
  } = {}
): Promise<{
  success: boolean
  changes: Array<{
    productId: string | number
    action: 'removed' | 'quantity_reduced' | 'no_change'
    oldQuantity: number
    newQuantity: number
  }>
  message: string
}> {
  const {
    removeUnavailableItems = true,
    adjustQuantitiesToAvailable = true,
  } = options

  try {
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 1,
    })

    if (!cart || !cart.items) {
      return {
        success: true,
        changes: [],
        message: 'Cart is empty or not found',
      }
    }

    const changes: Array<{
      productId: string | number
      action: 'removed' | 'quantity_reduced' | 'no_change'
      oldQuantity: number
      newQuantity: number
    }> = []

    const updatedItems = []

    for (const item of cart.items) {
      if (!item.product) {
        updatedItems.push(item)
        continue
      }

      const productId = typeof item.product === 'object' ? item.product.id : item.product
      const currentQuantity = item.quantity || 0

      if (currentQuantity <= 0) {
        updatedItems.push(item)
        continue
      }

      const stockInfo = await getProductStockInfo(payload, productId)

      if (stockInfo.totalAvailable === 0) {
        if (removeUnavailableItems) {
          changes.push({
            productId,
            action: 'removed',
            oldQuantity: currentQuantity,
            newQuantity: 0,
          })
          // Don't add to updatedItems (remove from cart)
        } else {
          updatedItems.push(item)
          changes.push({
            productId,
            action: 'no_change',
            oldQuantity: currentQuantity,
            newQuantity: currentQuantity,
          })
        }
      } else if (currentQuantity > stockInfo.totalAvailable) {
        if (adjustQuantitiesToAvailable) {
          const newQuantity = stockInfo.totalAvailable
          changes.push({
            productId,
            action: 'quantity_reduced',
            oldQuantity: currentQuantity,
            newQuantity,
          })
          updatedItems.push({
            ...item,
            quantity: newQuantity,
          })
        } else {
          updatedItems.push(item)
          changes.push({
            productId,
            action: 'no_change',
            oldQuantity: currentQuantity,
            newQuantity: currentQuantity,
          })
        }
      } else {
        updatedItems.push(item)
        changes.push({
          productId,
          action: 'no_change',
          oldQuantity: currentQuantity,
          newQuantity: currentQuantity,
        })
      }
    }

    // Update the cart if changes were made
    const hasChanges = changes.some(change => change.action !== 'no_change')

    if (hasChanges) {
      await payload.update({
        collection: 'carts',
        id: cartId,
        data: {
          items: updatedItems,
        },
        context: {
          skipStockValidation: true,
          skipOversellingValidation: true,
          skipCartUpdates: true,
        },
      })
    }

    const removedCount = changes.filter(c => c.action === 'removed').length
    const reducedCount = changes.filter(c => c.action === 'quantity_reduced').length

    let message = 'Cart updated successfully'
    if (removedCount > 0 && reducedCount > 0) {
      message = `Removed ${removedCount} unavailable items and reduced quantities for ${reducedCount} items`
    } else if (removedCount > 0) {
      message = `Removed ${removedCount} unavailable items`
    } else if (reducedCount > 0) {
      message = `Reduced quantities for ${reducedCount} items due to stock limitations`
    } else {
      message = 'No changes needed - all items are available'
    }

    return {
      success: true,
      changes,
      message,
    }

  } catch (error) {
    payload.logger.error(`Error auto-fixing cart stock: ${error instanceof Error ? error.message : String(error)}`)

    return {
      success: false,
      changes: [],
      message: `Failed to fix cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Get comprehensive stock information for a product
 */
async function getProductStockInfo(payload: Payload, productId: string | number) {
  try {
    const inventoryResult = await payload.find({
      collection: 'inventory',
      where: {
        product: { equals: productId }
      },
      limit: 1,
    })

    let totalAvailable = 0

    if (inventoryResult.docs.length > 0) {
      const inventory = inventoryResult.docs[0]
      totalAvailable = inventory.quantity || 0
    }

    return {
      totalStock: totalAvailable,
      totalAvailable: totalAvailable,
      totalReserved: 0,
      hasExpiredBatches: false,
      batchCount: 1,
    }

  } catch (error) {
    payload.logger.error(`Error getting product stock info: ${error instanceof Error ? error.message : String(error)}`)
    return {
      totalStock: 0,
      totalAvailable: 0,
      totalReserved: 0,
      hasExpiredBatches: false,
      batchCount: 0,
    }
  }
}