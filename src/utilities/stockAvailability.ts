import type { Inventory } from '@/payload-types'
import type { Payload } from 'payload'
import { generateCacheKey, stockCaching } from './caching'

/**
 * Core stock availability checking utilities with caching
 * Simplified for MVP - uses quantity and low_stock_threshold only
 */

export interface StockAvailabilityResult {
  productId: string | number
  quantity: number
  lowStockThreshold: number
  isAvailable: boolean
  isLowStock: boolean
}

/**
 * Check stock availability for a single product
 * Uses simplified 1:1 inventory relationship
 */
export async function checkStockAvailability(
  payload: Payload,
  productId: string | number,
  requestedQuantity: number = 1
): Promise<StockAvailabilityResult> {
  try {
    // Generate cache key for this specific request
    const cacheKey = generateCacheKey('stock-availability', {
      productId,
      requestedQuantity,
      date: new Date().toISOString().split('T')[0],
    })

    // Try to get from cache first
    const cached = stockCaching.getStockAvailability(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Get inventory for the product (1:1 relationship)
    const inventoryResult = await payload.find({
      collection: 'inventory',
      where: {
        product: { equals: productId },
      },
      limit: 1,
    })

    if (inventoryResult.docs.length === 0) {
      const result: StockAvailabilityResult = {
        productId,
        quantity: 0,
        lowStockThreshold: 10,
        isAvailable: false,
        isLowStock: true,
      }
      stockCaching.setStockAvailability(cacheKey, result, 2 * 60 * 1000)
      return result
    }

    const inventory = inventoryResult.docs[0]
    const quantity = inventory.quantity || 0
    const threshold = inventory.low_stock_threshold || 10

    const result: StockAvailabilityResult = {
      productId,
      quantity,
      lowStockThreshold: threshold,
      isAvailable: quantity >= requestedQuantity,
      isLowStock: quantity <= threshold,
    }

    // Cache the result for 2 minutes
    stockCaching.setStockAvailability(cacheKey, result, 2 * 60 * 1000)

    return result
  } catch (error) {
    payload.logger.error(
      `Error checking stock availability for product ${productId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      productId,
      quantity: 0,
      lowStockThreshold: 10,
      isAvailable: false,
      isLowStock: true,
    }
  }
}

/**
 * Check stock availability for multiple products at once
 */
export async function checkBulkStockAvailability(
  payload: Payload,
  items: Array<{ productId: string | number; quantity: number }>
): Promise<{
  allAvailable: boolean
  results: StockAvailabilityResult[]
  unavailableProducts: Array<{
    productId: string | number
    requested: number
    available: number
  }>
}> {
  try {
    const results: StockAvailabilityResult[] = []
    const unavailableProducts: Array<{
      productId: string | number
      requested: number
      available: number
    }> = []

    for (const item of items) {
      const result = await checkStockAvailability(payload, item.productId, item.quantity)
      results.push(result)

      if (!result.isAvailable) {
        unavailableProducts.push({
          productId: item.productId,
          requested: item.quantity,
          available: result.quantity,
        })
      }
    }

    return {
      allAvailable: unavailableProducts.length === 0,
      results,
      unavailableProducts,
    }
  } catch (error) {
    payload.logger.error(
      `Error checking bulk stock availability: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      allAvailable: false,
      results: [],
      unavailableProducts: items.map((item) => ({
        productId: item.productId,
        requested: item.quantity,
        available: 0,
      })),
    }
  }
}

/**
 * Get low stock products (below low_stock_threshold)
 */
export async function getLowStockProducts(
  payload: Payload,
  options: { limit?: number } = {}
): Promise<
  Array<{
    productId: string | number
    productName: string
    quantity: number
    lowStockThreshold: number
    deficit: number
  }>
> {
  try {
    const { limit = 100 } = options

    // Get all inventory
    const inventoryResult = await payload.find({
      collection: 'inventory',
      limit: 10000,
      depth: 1,
    })

    // Filter products below low_stock_threshold
    const lowStockProducts = inventoryResult.docs
      .filter((inventory: Inventory) => {
        const quantity = inventory.quantity || 0
        const threshold = inventory.low_stock_threshold || 10
        return quantity <= threshold
      })
      .map((inventory: Inventory) => {
        const productId =
          typeof inventory.product === 'object' ? inventory.product.id : inventory.product
        const productName =
          typeof inventory.product === 'object' ? inventory.product.title : String(productId)
        const quantity = inventory.quantity || 0
        const threshold = inventory.low_stock_threshold || 10

        return {
          productId,
          productName,
          quantity,
          lowStockThreshold: threshold,
          deficit: Math.max(0, threshold - quantity),
        }
      })
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, limit)

    return lowStockProducts
  } catch (error) {
    payload.logger.error(
      `Error getting low stock products: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}

/**
 * Invalidate stock cache for a product
 */
export function invalidateStockCache(productId: string | number): void {
  stockCaching.invalidateProduct(String(productId))
}

/**
 * Invalidate all stock caches
 */
export function invalidateAllStockCaches(): void {
  stockCaching.invalidateAll()
}
