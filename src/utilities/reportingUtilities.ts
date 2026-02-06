/**
 * Reporting Utilities
 * 
 * Simplified for MVP schema - 1:1 inventory, no expiry, no unit_cost
 */

import type { Product } from '@/payload-types'
import type { Payload, Where } from 'payload'

export interface SalesReport {
  period: {
    startDate: string
    endDate: string
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  }
  summary: {
    totalOrders: number
    totalRevenue: number
    totalQuantitySold: number
    averageOrderValue: number
  }
  topProducts: Array<{
    productId: string | number
    productName: string
    quantitySold: number
    revenue: number
    orderCount: number
    averagePrice: number
  }>
  categoryBreakdown: Array<{
    categoryId: string | number
    categoryName: string
    orderCount: number
    revenue: number
    quantitySold: number
    revenuePercentage: number
  }>
  dailyTrends: Array<{
    date: string
    orderCount: number
    revenue: number
    quantitySold: number
  }>
  generatedAt: string
}

export interface InventoryStatusReport {
  summary: {
    totalProducts: number
    totalBatches: number // Is now just total inventory items
    totalValue: number
    availableValue: number
    expiredValue: number
    expiringValue: number
    lowStockProducts: number
    outOfStockProducts: number
  }
  stockLevels: {
    adequate: number
    low: number
    critical: number
    outOfStock: number
  }
  expiryAnalysis: {
    expiredBatches: number
    expiringIn7Days: number
    expiringIn30Days: number
    expiringIn90Days: number
  }
  categoryAnalysis: Array<{
    categoryId: string | number
    categoryName: string
    totalProducts: number
    lowStockCount: number
    totalValue: number
    expiringValue: number
  }>
  supplierAnalysis: Array<{
    supplier: string // Removed from schema, will be empty/unknown
    batchCount: number
    totalValue: number
    expiredBatches: number
    lowStockBatches: number
  }>
  generatedAt: string
}

export interface FinancialReport {
  period: {
    startDate: string
    endDate: string
  }
  revenue: {
    total: number
    subtotal: number
    tax: number
    shipping: number
  }
  generatedAt: string
}

/**
 * Generate comprehensive sales report for specified period
 */
export async function generateSalesReport(
  payload: Payload,
  options: {
    startDate: string
    endDate: string
    periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
    includeDetails?: boolean
    categoryId?: string | number
  }
): Promise<SalesReport> {
  try {
    const { startDate, endDate, periodType = 'custom', includeDetails: _includeDetails = true, categoryId } = options

    // Build order query conditions
    const orderWhere: Where = {
      and: [
        { createdAt: { greater_than_equal: startDate } },
        { createdAt: { less_than_equal: endDate } },
        { status: { in: ['confirmed', 'processing', 'shipped', 'delivered'] } },
      ],
    }

    // Get orders for the period
    const ordersResult = await payload.find({
      collection: 'orders',
      where: orderWhere,
      depth: 2,
      limit: 10000,
    })

    let totalRevenue = 0
    let totalQuantitySold = 0

    const productSales = new Map<string, {
      productId: string | number
      productName: string
      quantitySold: number
      revenue: number
      orderCount: number
    }>()

    const categorySales = new Map<string, {
      categoryId: string | number
      categoryName: string
      orderCount: number
      revenue: number
      quantitySold: number
    }>()

    const dailySales = new Map<string, {
      date: string
      orderCount: number
      revenue: number
      quantitySold: number
    }>()

    // Process each order
    for (const order of ordersResult.docs) {
      const orderRevenue = order.total || 0
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0]

      totalRevenue += orderRevenue

      // Process order items
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const product = typeof item.product === 'object' ? (item.product as Product) : null
          if (!product) continue

          // Apply category filter if specified
          if (categoryId) {
            const category = product.category
            const currentCategoryId = typeof category === 'object' ? category.id : category
            if (currentCategoryId !== categoryId) continue
          }

          const quantity = item.quantity || 0
          // Price snapshot missing in current schema types, using 0 for now or fetch from product if needed
          const itemRevenue = 0 // (item.price || 0) * quantity

          totalQuantitySold += quantity

          // Track product sales
          const productKey = String(product.id)
          if (!productSales.has(productKey)) {
            productSales.set(productKey, {
              productId: product.id,
              productName: product.title || 'Unknown Product',
              quantitySold: 0,
              revenue: 0,
              orderCount: 0,
            })
          }

          const productData = productSales.get(productKey)!
          productData.quantitySold += quantity
          productData.revenue += itemRevenue
          productData.orderCount++

          // Track category sales
          const category = product.category
          if (category) {
            const categoryObj = typeof category === 'object' ? category : null
            if (categoryObj) {
              const categoryKey = String(categoryObj.id)
              const categoryName = categoryObj.name || 'Unknown'

              if (!categorySales.has(categoryKey)) {
                categorySales.set(categoryKey, {
                  categoryId: categoryKey,
                  categoryName,
                  orderCount: 0,
                  revenue: 0,
                  quantitySold: 0,
                })
              }

              const categoryData = categorySales.get(categoryKey)!
              categoryData.revenue += itemRevenue
              categoryData.quantitySold += quantity
              categoryData.orderCount++
            }
          }
        }
      }

      // Track daily sales
      if (!dailySales.has(orderDate)) {
        dailySales.set(orderDate, {
          date: orderDate,
          orderCount: 0,
          revenue: 0,
          quantitySold: 0,
        })
      }

      const dailyData = dailySales.get(orderDate)!
      dailyData.orderCount++
      dailyData.revenue += orderRevenue
    }

    // Calculate averages and percentages
    const totalOrders = ordersResult.docs.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Sort and limit top products
    const topProducts = Array.from(productSales.values())
      .map(product => ({
        ...product,
        averagePrice: product.quantitySold > 0 ? product.revenue / product.quantitySold : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)

    // Calculate category percentages
    const categoryBreakdown = Array.from(categorySales.values())
      .map(category => ({
        ...category,
        revenuePercentage: totalRevenue > 0 ? (category.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Sort daily trends
    const dailyTrends = Array.from(dailySales.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      period: {
        startDate,
        endDate,
        periodType,
      },
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalQuantitySold,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      },
      topProducts,
      categoryBreakdown,
      dailyTrends,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    payload.logger.error(
      `Error generating sales report: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      period: { startDate: options.startDate, endDate: options.endDate, periodType: 'custom' },
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        totalQuantitySold: 0,
        averageOrderValue: 0,
      },
      topProducts: [],
      categoryBreakdown: [],
      dailyTrends: [],
      generatedAt: new Date().toISOString(),
    }
  }
}

/**
 * Generate comprehensive inventory status report
 */
export async function generateInventoryStatusReport(
  payload: Payload,
  options: {
    includeExpired?: boolean
    categoryId?: string | number
  } = {}
): Promise<InventoryStatusReport> {
  try {
    const { categoryId } = options

    // Get all inventory data
    const inventoryResult = await payload.find({
      collection: 'inventory',
      where: { quantity: { greater_than_equal: 0 } },
      depth: 2,
      limit: 10000,
    })

    let lowStockProducts = 0
    let outOfStockProducts = 0

    const stockLevels = { adequate: 0, low: 0, critical: 0, outOfStock: 0 }
    // Legacy metrics zeroed out
    const expiryAnalysis = { expiredBatches: 0, expiringIn7Days: 0, expiringIn30Days: 0, expiringIn90Days: 0 }

    const categoryMap = new Map<string, {
      categoryId: string | number
      categoryName: string
      totalProducts: number
      lowStockCount: number
      totalValue: number
      expiringValue: number
    }>()

    // Process inventory data
    for (const inventory of inventoryResult.docs) {
      const product = typeof inventory.product === 'object' ? (inventory.product as Product) : null
      if (!product) continue

      // Apply category filter
      if (categoryId) {
        const category = product.category
        const currentCategoryId = typeof category === 'object' ? category.id : category
        if (currentCategoryId !== categoryId) continue
      }

      const currentQuantity = inventory.quantity || 0
      const minimumLevel = inventory.low_stock_threshold || 10
      // No unit cost or expiry in new schema

      // Determine stock level
      if (currentQuantity === 0) {
        stockLevels.outOfStock++
        outOfStockProducts++
      } else if (currentQuantity <= Math.max(1, Math.floor(minimumLevel * 0.5))) {
        stockLevels.critical++
        lowStockProducts++
      } else if (currentQuantity <= minimumLevel) {
        stockLevels.low++
        lowStockProducts++
      } else {
        stockLevels.adequate++
      }

      // Category analysis
      const category = product.category
      if (category && typeof category === 'object') {
        const categoryKey = String(category.id)
        const categoryName = category.name || 'Unknown'

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            categoryId: categoryKey,
            categoryName,
            totalProducts: 0,
            lowStockCount: 0,
            totalValue: 0,
            expiringValue: 0,
          })
        }

        const categoryData = categoryMap.get(categoryKey)!
        categoryData.totalProducts++
        if (currentQuantity <= minimumLevel) categoryData.lowStockCount++
      }
    }

    return {
      summary: {
        totalProducts: inventoryResult.docs.length,
        totalBatches: inventoryResult.docs.length,
        totalValue: 0, // No cost info
        availableValue: 0,
        expiredValue: 0,
        expiringValue: 0,
        lowStockProducts,
        outOfStockProducts,
      },
      stockLevels,
      expiryAnalysis,
      categoryAnalysis: Array.from(categoryMap.values()),
      supplierAnalysis: [],
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    payload.logger.error(
      `Error generating inventory status report: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      summary: {
        totalProducts: 0,
        totalBatches: 0,
        totalValue: 0,
        availableValue: 0,
        expiredValue: 0,
        expiringValue: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
      },
      stockLevels: { adequate: 0, low: 0, critical: 0, outOfStock: 0 },
      expiryAnalysis: { expiredBatches: 0, expiringIn7Days: 0, expiringIn30Days: 0, expiringIn90Days: 0 },
      categoryAnalysis: [],
      supplierAnalysis: [],
      generatedAt: new Date().toISOString(),
    }
  }
}

/**
 * Generate financial report for specified period
 */
export async function generateFinancialReport(
  payload: Payload,
  options: {
    startDate: string
    endDate: string
  }
): Promise<FinancialReport> {
  const { startDate, endDate } = options

  // Basic implementation using sales report logic
  const salesReport = await generateSalesReport(payload, {
    startDate,
    endDate,
    includeDetails: false
  })

  return {
    period: { startDate, endDate },
    revenue: {
      total: salesReport.summary.totalRevenue,
      subtotal: salesReport.summary.totalRevenue, // Assuming simplified tax logic
      tax: 0,
      shipping: 0
    },
    generatedAt: new Date().toISOString()
  }
}