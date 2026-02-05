/**
 * Stock Management Utilities
 * simplified for MVP - 1:1 inventory, no expiry
 */

import type { Inventory, Product } from '@/payload-types'
import type { Payload } from 'payload'

export interface LowStockProduct {
  productId: string | number
  productName: string
  productSlug: string
  category: string
  totalAvailable: number
  minimumStockLevel: number
  deficit: number
  deficitPercentage: number
  estimatedValue: number
  requiresPrescription: boolean
  lastRestocked?: string
}

export interface StockOptimizationRecommendation {
  productId: string | number
  productName: string
  currentStock: number
  minimumLevel: number
  recommendedOrderQuantity: number
  averageDailyUsage: number
  daysOfStockRemaining: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  reason: string
  estimatedCost: number
}

// Stub types for removed features to prevent breakages
export interface ExpiringProduct {
  productId: string | number
  productName: string
  expiryDate: string
  quantity: number
}

export interface InventoryValuation {
  totalValue: number
  availableValue: number
  reservedValue: number
  expiredValue: number
  expiringValue: number
  categoryBreakdown: any[]
  supplierBreakdown: any[]
  lastCalculated: string
}

/**
 * Get low stock products with advanced filtering and sorting options
 */
export async function getLowStockProducts(
  payload: Payload,
  options: {
    limit?: number
    categoryId?: string | number
    requiresPrescription?: boolean
    sortBy?: 'deficit' | 'percentage' | 'value'
    sortOrder?: 'asc' | 'desc'
    minDeficit?: number
  } = {}
): Promise<LowStockProduct[]> {
  try {
    const {
      limit = 100,
      categoryId,
      requiresPrescription,
      sortBy = 'deficit',
      sortOrder = 'desc',
      minDeficit = 1,
    } = options

    // Get inventory
    const inventoryResult = await payload.find({
      collection: 'inventory',
      where: {
        quantity: { greater_than_equal: 0 },
      },
      depth: 2,
      limit: 10000,
    })

    // Transform and filter
    const lowStockProducts = inventoryResult.docs
      .map((inventory: Inventory) => {
        const product = typeof inventory.product === 'object' ? (inventory.product as Product) : null
        if (!product) return null

        const productId = product.id

        // Apply category filter
        const categories = product.categories
        if (categoryId) {
          if (!categories || categories.length === 0) return null
          const hasCategory = categories.some(cat => {
            if (typeof cat === 'object') return cat.id === categoryId
            return cat === categoryId
          })
          if (!hasCategory) return null
        }

        // Apply prescription filter
        if (requiresPrescription !== undefined && product.requires_prescription !== requiresPrescription) return null

        const quantity = inventory.quantity || 0
        const threshold = inventory.low_stock_threshold || 10
        const deficit = threshold - quantity

        // Filter by min deficit
        if (deficit < minDeficit) return null

        const deficitPercentage = threshold > 0
          ? Math.round((deficit / threshold) * 100)
          : 0

        // Estimate value (placeholder cost as unit_cost was removed)
        const unitCost = 0 // unit_cost removed from schema
        const estimatedValue = quantity * unitCost

        return {
          productId: product.id,
          productName: product.title || product.generic_name || 'Unknown Product',
          productSlug: product.slug || '',
          category: (categories && categories.length > 0 && typeof categories[0] === 'object')
            ? (categories[0].name || 'Uncategorized')
            : 'Uncategorized',
          totalAvailable: quantity,
          minimumStockLevel: threshold,
          deficit,
          deficitPercentage,
          estimatedValue,
          requiresPrescription: product.requires_prescription || false,
          lastRestocked: inventory.updatedAt,
        } as LowStockProduct
      })
      .filter((item): item is LowStockProduct => item !== null)

    // Sort results
    lowStockProducts.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'deficit':
          comparison = a.deficit - b.deficit
          break
        case 'percentage':
          comparison = a.deficitPercentage - b.deficitPercentage
          break
        case 'value':
          comparison = a.estimatedValue - b.estimatedValue
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    return lowStockProducts.slice(0, limit)
  } catch (error) {
    payload.logger.error(
      `Error getting low stock products: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}

/**
 * Generate stock optimization recommendations
 */
export async function generateStockOptimizationRecommendations(
  payload: Payload,
  options: {
    limit?: number
    categoryId?: string | number
  } = {}
): Promise<StockOptimizationRecommendation[]> {
  try {
    const { limit = 50, categoryId } = options

    const lowStockProducts = await getLowStockProducts(payload, {
      limit: limit * 2,
      categoryId,
    })

    const recommendations: StockOptimizationRecommendation[] = lowStockProducts.map(product => {
      // Simple logic since we don't have usage history easily accessible in this MVP
      const estimatedDailyUsage = Math.max(1, Math.floor(product.deficit / 7))
      const daysOfStockRemaining = Math.floor(product.totalAvailable / estimatedDailyUsage)

      const safetyStock = Math.ceil(product.minimumStockLevel * 0.2)
      const recommendedOrderQuantity = product.deficit + safetyStock

      let priority: 'low' | 'medium' | 'high' | 'urgent'
      let reason: string

      if (product.totalAvailable === 0) {
        priority = 'urgent'
        reason = 'Out of stock'
      } else if (daysOfStockRemaining <= 3) {
        priority = 'urgent'
        reason = `Only ${daysOfStockRemaining} days of stock remaining`
      } else if (product.deficitPercentage >= 80) {
        priority = 'high'
        reason = `${product.deficitPercentage}% below minimum level`
      } else {
        priority = 'medium'
        reason = `${product.deficitPercentage}% below minimum level`
      }

      return {
        productId: product.productId,
        productName: product.productName,
        currentStock: product.totalAvailable,
        minimumLevel: product.minimumStockLevel,
        recommendedOrderQuantity,
        averageDailyUsage: estimatedDailyUsage,
        daysOfStockRemaining,
        priority,
        reason,
        estimatedCost: 0, // Cost tracking removed
      }
    })

    return recommendations.slice(0, limit)
  } catch (error) {
    payload.logger.error(
      `Error generating stock optimization recommendations: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}

// Stub for retired function to prevent import errors in short term
export async function getExpiringProducts(payload: Payload, options: any = {}): Promise<ExpiringProduct[]> {
  return []
}

// Stub for inventory valuation
export async function calculateInventoryValuation(payload: Payload, options: any = {}): Promise<InventoryValuation> {
  return {
    totalValue: 0,
    availableValue: 0,
    reservedValue: 0,
    expiredValue: 0,
    expiringValue: 0,
    categoryBreakdown: [],
    supplierBreakdown: [],
    lastCalculated: new Date().toISOString()
  }
}