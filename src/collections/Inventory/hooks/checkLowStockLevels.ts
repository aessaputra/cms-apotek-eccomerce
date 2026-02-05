import type { Inventory } from '@/payload-types'
import type { CollectionAfterReadHook, Payload } from 'payload'

/**
 * Check and flag low stock levels for inventory items
 * This hook adds low stock information to inventory documents
 * 
 * Updated for simplified schema: only uses quantity and low_stock_threshold
 */
export const checkLowStockLevels: CollectionAfterReadHook = async ({
  doc,
  req,
}) => {
  try {
    const quantity = doc.quantity || 0
    const threshold = doc.low_stock_threshold || 10

    // Check various stock level conditions
    const isOutOfStock = quantity === 0
    const isLowStock = quantity > 0 && quantity <= threshold
    const isCriticallyLow = quantity > 0 && quantity <= Math.max(1, Math.floor(threshold * 0.5))

    // Calculate stock level percentage
    const stockLevelPercentage = threshold > 0
      ? Math.round((quantity / threshold) * 100)
      : 100

    // Determine stock status
    let stockStatus: 'out_of_stock' | 'critically_low' | 'low' | 'adequate' | 'high'

    if (isOutOfStock) {
      stockStatus = 'out_of_stock'
    } else if (isCriticallyLow) {
      stockStatus = 'critically_low'
    } else if (isLowStock) {
      stockStatus = 'low'
    } else if (quantity <= threshold * 2) {
      stockStatus = 'adequate'
    } else {
      stockStatus = 'high'
    }

    // Add stock level information to the document
    const stockInfo = {
      quantity,
      low_stock_threshold: threshold,
      is_out_of_stock: isOutOfStock,
      is_low_stock: isLowStock,
      is_critically_low: isCriticallyLow,
      stock_level_percentage: stockLevelPercentage,
      stock_status: stockStatus,
      needs_reorder: isLowStock || isOutOfStock,
    }

    return {
      ...doc,
      stock_info: stockInfo,
    }
  } catch (error) {
    req.payload.logger.error(`Error checking low stock levels for inventory ${doc.id}: ${error instanceof Error ? error.message : String(error)}`)

    // Return document with safe defaults if calculation fails
    return {
      ...doc,
      stock_info: {
        quantity: 0,
        low_stock_threshold: 10,
        is_out_of_stock: true,
        is_low_stock: true,
        is_critically_low: true,
        stock_level_percentage: 0,
        stock_status: 'out_of_stock' as const,
        needs_reorder: true,
      },
    }
  }
}

/**
 * Get all low stock inventory items
 */
export const getLowStockInventory = async (payload: Payload): Promise<Inventory[]> => {
  try {
    const allInventory = await payload.find({
      collection: 'inventory',
      limit: 1000,
      depth: 2,
    })

    // Filter items where quantity <= low_stock_threshold
    return allInventory.docs.filter((item: Inventory) => {
      const quantity = item.quantity || 0
      const threshold = item.low_stock_threshold || 10
      return quantity <= threshold
    })
  } catch (error) {
    payload.logger.error(`Error fetching low stock inventory: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

/**
 * Get out of stock inventory items
 */
export const getOutOfStockInventory = async (payload: Payload): Promise<Inventory[]> => {
  try {
    const outOfStockItems = await payload.find({
      collection: 'inventory',
      where: {
        quantity: {
          equals: 0,
        },
      },
      depth: 2,
      limit: 1000,
    })

    return outOfStockItems.docs
  } catch (error) {
    payload.logger.error(`Error fetching out of stock inventory: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

/**
 * Get inventory items that need reordering
 */
export const getInventoryNeedingReorder = async (payload: Payload): Promise<{
  low_stock: Inventory[]
  out_of_stock: Inventory[]
  total_items: number
}> => {
  try {
    const [lowStockItems, outOfStockItems] = await Promise.all([
      getLowStockInventory(payload),
      getOutOfStockInventory(payload),
    ])

    // Remove duplicates
    const outOfStockIds = new Set(outOfStockItems.map(item => item.id))
    const uniqueLowStockItems = lowStockItems.filter(item => !outOfStockIds.has(item.id))

    return {
      low_stock: uniqueLowStockItems,
      out_of_stock: outOfStockItems,
      total_items: uniqueLowStockItems.length + outOfStockItems.length,
    }
  } catch (error) {
    payload.logger.error(`Error fetching inventory needing reorder: ${error instanceof Error ? error.message : String(error)}`)
    return {
      low_stock: [],
      out_of_stock: [],
      total_items: 0,
    }
  }
}

/**
 * Get stock for a specific product (simplified - 1:1 relationship)
 */
export const getProductStock = async (
  payload: Payload,
  productId: string
): Promise<{
  quantity: number
  low_stock_threshold: number
  is_low_stock: boolean
  is_out_of_stock: boolean
}> => {
  try {
    const inventory = await payload.find({
      collection: 'inventory',
      where: {
        product: {
          equals: productId,
        },
      },
      limit: 1,
      depth: 0,
    })

    if (inventory.docs.length === 0) {
      return {
        quantity: 0,
        low_stock_threshold: 10,
        is_low_stock: true,
        is_out_of_stock: true,
      }
    }

    const item = inventory.docs[0] as Inventory
    const quantity = item.quantity || 0
    const threshold = item.low_stock_threshold || 10

    return {
      quantity,
      low_stock_threshold: threshold,
      is_low_stock: quantity <= threshold,
      is_out_of_stock: quantity === 0,
    }
  } catch (error) {
    payload.logger.error(`Error getting product stock: ${error instanceof Error ? error.message : String(error)}`)
    return {
      quantity: 0,
      low_stock_threshold: 10,
      is_low_stock: true,
      is_out_of_stock: true,
    }
  }
}