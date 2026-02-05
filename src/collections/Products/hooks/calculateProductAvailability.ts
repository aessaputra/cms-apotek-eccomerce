import { generateCacheKey, productCaching } from '@/utilities/caching'
import type { CollectionAfterReadHook } from 'payload'

/**
 * Calculate product availability based on inventory with caching
 * This hook adds computed availability information to product data
 * Uses caching to improve performance for frequently accessed products
 * 
 * Simplified for 1:1 inventory schema
 */
export const calculateProductAvailability: CollectionAfterReadHook = async ({
  doc,
  req,
}) => {
  try {
    // Get the product ID
    const productId = doc.id

    if (!productId) {
      req.payload.logger.warn('No product ID found for availability calculation')
      return {
        ...doc,
        availability: {
          in_stock: false,
          stock_level: 'unknown',
          available_quantity: 0,
          low_stock_warning: true,
          total_batches: 0,
        },
      }
    }

    // Generate cache key for availability calculation
    const cacheKey = generateCacheKey('product-availability', {
      productId,
      date: new Date().toISOString().split('T')[0], // Include date to invalidate daily
    })

    // Try to get cached availability first
    const cachedAvailability = productCaching.getProduct(cacheKey)
    if (cachedAvailability) {
      return {
        ...doc,
        availability: cachedAvailability,
      }
    }

    // Get available stock from inventory (1:1 relationship)
    const inventoryResult = await req.payload.find({
      collection: 'inventory',
      where: {
        product: { equals: productId }
      },
      limit: 1,
      req,
    })

    let totalQuantity = 0
    let lowStockThreshold = 10

    if (inventoryResult.docs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inventory: any = inventoryResult.docs[0]
      totalQuantity = inventory.quantity || 0
      lowStockThreshold = inventory.low_stock_threshold || 10
    }

    // Determine stock level based on available quantity
    let stockLevel: 'high' | 'medium' | 'low' | 'out_of_stock'
    let lowStockWarning = false

    if (totalQuantity === 0) {
      stockLevel = 'out_of_stock'
      lowStockWarning = true
    } else if (totalQuantity <= lowStockThreshold) {
      stockLevel = 'low'
      lowStockWarning = true
    } else if (totalQuantity <= lowStockThreshold * 5) { // Arbitrary multiplier for medium
      stockLevel = 'medium'
      lowStockWarning = false
    } else {
      stockLevel = 'high'
      lowStockWarning = false
    }

    // Add availability info to the document
    const availability = {
      in_stock: totalQuantity > 0,
      stock_level: stockLevel,
      available_quantity: totalQuantity,
      low_stock_warning: lowStockWarning,
      // total_batches: Removed as no longer applicable
      // batches_info: Removed
    }

    // Cache the availability for 5 minutes
    productCaching.setProduct(cacheKey, availability, 5 * 60 * 1000)

    return {
      ...doc,
      availability,
    }
  } catch (error) {
    req.payload.logger.error(`Error calculating product availability: ${error instanceof Error ? error.message : String(error)}`)

    // Return document with default availability if calculation fails
    return {
      ...doc,
      availability: {
        in_stock: false,
        stock_level: 'unknown',
        available_quantity: 0,
        low_stock_warning: true,
      },
    }
  }
}