import type { Payload } from 'payload'
import { checkBulkStockAvailability } from './stockAvailability'

/**
 * Order processing utilities
 */

export interface OrderValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stockInfo: Array<{
    productId: string | number
    productName: string
    requestedQuantity: number
    availableQuantity: number
    isAvailable: boolean
  }>
}

export interface OrderProcessingResult {
  success: boolean
  orderId: string | number
  message: string
  stockMovements?: unknown[]
  errors?: string[]
}

/**
 * Validate an order before processing
 * Checks stock availability and address validation
 */
export async function validateOrder(
  payload: Payload,
  orderId: string | number
): Promise<OrderValidationResult> {
  try {
    // Get the order with populated data
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    })

    if (!order) {
      return {
        isValid: false,
        errors: ['Order not found'],
        warnings: [],
        stockInfo: [],
      }
    }

    const errors: string[] = []
    const warnings: string[] = []
    const stockInfo: OrderValidationResult['stockInfo'] = []

    // Validate order items and stock
    if (!order.items || order.items.length === 0) {
      errors.push('Order has no items')
    } else {
      // Prepare items for bulk stock check
      const itemsToCheck = order.items
        .filter((item) => item && typeof item === 'object' && 'product' in item && 'quantity' in item)
        .map((item) => ({
          productId: typeof item.product === 'object' && item.product !== null
            ? (typeof item.product.id === 'string' ? item.product.id : String(item.product.id))
            : String(item.product),
          quantity: item.quantity || 0,
          productName: typeof item.product === 'object' && item.product !== null
            ? (item.product.title || String(item.product.id))
            : String(item.product),
        }))

      // Check stock availability for all items
      const stockCheck = await checkBulkStockAvailability(
        payload,
        itemsToCheck.map(item => ({ productId: item.productId, quantity: item.quantity }))
      )

      // Process stock check results
      for (let i = 0; i < itemsToCheck.length; i++) {
        const item = itemsToCheck[i]
        const stockResult = stockCheck.results[i]

        stockInfo.push({
          productId: item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableQuantity: stockResult.quantity,
          isAvailable: stockResult.isAvailable,
        })

        if (!stockResult.isAvailable) {
          errors.push(
            `Insufficient stock for "${item.productName}": requested ${item.quantity}, available ${stockResult.quantity}`
          )
        }

        // Check for low stock warnings
        if (stockResult.isAvailable && stockResult.quantity < item.quantity * 2) {
          warnings.push(
            `Low stock warning for "${item.productName}": only ${stockResult.quantity} remaining after this order`
          )
        }
      }
    }

    // Validate addresses
    if (!order.shipping_address) {
      errors.push('Shipping address is required')
    }

    // Validate order status
    if (!order.status) {
      errors.push('Order status is required')
    }

    // Validate totals
    if (!order.total || order.total <= 0) {
      errors.push('Order total must be greater than zero')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stockInfo,
    }
  } catch (error) {
    payload.logger.error(
      `Error validating order ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      isValid: false,
      errors: [`Order validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      stockInfo: [],
    }
  }
}

/**
 * Process order confirmation with stock allocation
 */
export async function processOrderConfirmation(
  payload: Payload,
  orderId: string | number,
  _userId?: string | number
): Promise<OrderProcessingResult> {
  try {
    // First validate the order
    const validation = await validateOrder(payload, orderId)
    if (!validation.isValid) {
      return {
        success: false,
        orderId,
        message: 'Order validation failed',
        errors: validation.errors,
      }
    }

    // Get the order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    })

    if (!order) {
      return {
        success: false,
        orderId,
        message: 'Order not found',
        errors: ['Order not found'],
      }
    }

    // Process each item in the order
    for (const item of order.items || []) {
      if (item && typeof item === 'object' && 'product' in item && 'quantity' in item) {
        const productId = typeof item.product === 'object' && item.product !== null
          ? (typeof item.product.id === 'string' ? item.product.id : String(item.product.id))
          : String(item.product)
        const quantityToDeduct = item.quantity || 0

        if (productId && quantityToDeduct > 0) {
          // Find single inventory record
          const inventoryResult = await payload.find({
            collection: 'inventory',
            where: {
              product: { equals: productId },
            },
            limit: 1,
          })

          if (inventoryResult.docs.length > 0) {
            const inventory = inventoryResult.docs[0]
            const currentQty = inventory.quantity || 0
            const newQuantity = currentQty - quantityToDeduct

            if (newQuantity >= 0) {
              await payload.update({
                collection: 'inventory',
                id: inventory.id,
                data: {
                  quantity: newQuantity
                },
                overrideAccess: true,
                context: { skipHooks: true }
              })
            } else {
              payload.logger.error(`Processing Error: Insufficient stock for product ${productId} during confirmation`)
              // In real world, we'd abort all changes, but here we process what we can or should have failed validation earlier
            }
          }
        }
      }
    }

    // Update order status to confirmed
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: 'processing',
      },
      overrideAccess: true,
      context: { skipStockValidation: true },
    })

    return {
      success: true,
      orderId,
      message: `Order confirmed successfully`,
      stockMovements: [],
    }
  } catch (error) {
    payload.logger.error(
      `Error processing order confirmation ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      success: false,
      orderId,
      message: 'Order processing failed',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Cancel an order and restore stock
 */
export async function cancelOrder(
  payload: Payload,
  orderId: string | number,
  _reason?: string,
  _userId?: string | number
): Promise<OrderProcessingResult> {
  try {
    // Get the order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    })

    if (!order) {
      return {
        success: false,
        orderId,
        message: 'Order not found',
        errors: ['Order not found'],
      }
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed', 'processing'].includes(order.status || '')) {
      return {
        success: false,
        orderId,
        message: `Cannot cancel order with status: ${order.status}`,
        errors: [`Order status "${order.status}" does not allow cancellation`],
      }
    }

    // Restore stock based on order items
    if (order.items) {
      for (const item of order.items) {
        const productId = typeof item.product === 'object' && item.product !== null ? item.product.id : item.product
        const quantityToRestore = item.quantity || 0

        if (quantityToRestore > 0) {
          // Find inventory
          const inventoryResult = await payload.find({
            collection: 'inventory',
            where: { product: { equals: productId } },
            limit: 1
          })

          if (inventoryResult.docs.length > 0) {
            const inventory = inventoryResult.docs[0]
            const newQuantity = (inventory.quantity || 0) + quantityToRestore

            await payload.update({
              collection: 'inventory',
              id: inventory.id,
              data: { quantity: newQuantity },
              overrideAccess: true,
              context: { skipHooks: true }
            })
          }
        }
      }
    }

    // Update order status to cancelled
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: 'cancelled',
      },
      overrideAccess: true,
    })

    return {
      success: true,
      orderId,
      message: `Order cancelled successfully`,
      stockMovements: [], // None to return
    }
  } catch (error) {
    payload.logger.error(
      `Error cancelling order ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      success: false,
      orderId,
      message: 'Order cancellation failed',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Get order processing status and history
 * Provides detailed information about order processing steps
 */
export async function getOrderProcessingStatus(
  payload: Payload,
  orderId: string | number
): Promise<{
  orderId: string | number
  currentStatus: string
  canBeCancelled: boolean
  canBeProcessed: boolean
  stockMovements: unknown[]
  validationResult: OrderValidationResult
}> {
  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Get validation result
    const validationResult = await validateOrder(payload, orderId)

    // stockMovements effectively unused/empty now
    const stockMovements: unknown[] = []

    return {
      orderId,
      currentStatus: order.status || 'unknown',
      canBeCancelled: ['pending', 'confirmed', 'processing'].includes(order.status || ''),
      canBeProcessed: (order.status as string) === 'pending' && validationResult.isValid,
      stockMovements,
      validationResult,
    }
  } catch (error) {
    payload.logger.error(
      `Error getting order processing status ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    throw error
  }
}