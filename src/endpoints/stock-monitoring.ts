import { validateProductAvailability } from '@/utilities/pharmacy'
import { checkBulkStockAvailability, checkStockAvailability } from '@/utilities/stockAvailability'
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * Stock level monitoring endpoints
 */

/**
 * Check stock availability for a single product
 * GET /api/stock/check/:productId
 */
export const checkProductStock: Endpoint = {
  path: '/stock/check/:productId',
  method: 'get',
  handler: async (req) => {
    try {
      const { productId } = req.routeParams || {}
      const quantity = parseInt(req.query.quantity as string) || 1

      if (!productId || typeof productId !== 'string') {
        throw new APIError('Product ID is required', 400)
      }

      // Public endpoint - no authentication required for basic stock check
      // But provide more details for authenticated users
      const isAuthenticated = !!req.user
      const isAdmin = req.user?.role === 'admin'

      // filters unused
      // const filters: Where[] = []

      if (isAuthenticated) {
        // Detailed stock information for authenticated users
        const stockResult = await checkStockAvailability(req.payload, productId, quantity)

        interface StockResponse {
          success: boolean
          data: {
            productId: string
            isAvailable: boolean
            availableStock: number
            requestedQuantity: number
            totalStock?: number
            reservedStock?: number
          }
        }

        const response: StockResponse = {
          success: true,
          data: {
            productId,
            isAvailable: stockResult.isAvailable,
            availableStock: stockResult.quantity,
            requestedQuantity: quantity,
          },
        }

        // Additional details for admin users
        if (isAdmin) {
          response.data.totalStock = stockResult.quantity
          response.data.reservedStock = 0 // Removed reserved logic
        }

        return Response.json(response)
      } else {
        // Basic availability check for public users
        const availability = await validateProductAvailability(req.payload, productId, quantity)

        return Response.json({
          success: true,
          data: {
            productId,
            isAvailable: availability.isAvailable,
            message: availability.message,
          },
        })
      }
    } catch (error) {
      req.payload.logger.error(`Stock check error for product ${req.routeParams?.productId}: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Unable to check stock availability' },
        { status: 500 }
      )
    }
  },
}

/**
 * Bulk stock availability check
 * POST /api/stock/check-bulk
 */
export const checkBulkStock: Endpoint = {
  path: '/stock/check-bulk',
  method: 'post',
  handler: async (req) => {
    try {
      // Authentication required for bulk operations
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      // Parse request body
      let body: Record<string, unknown> = {}
      try {
        if (req.json) {
          body = await req.json()
        }
      } catch {
        // Ignore parsing errors, use empty object
      }

      const items = body?.items

      if (!Array.isArray(items) || items.length === 0) {
        throw new APIError('Items array is required', 400)
      }

      // Validate items format
      const validItems = items.filter(item =>
        item &&
        typeof item === 'object' &&
        (item.productId || item.product_id) &&
        typeof (item.quantity || 1) === 'number'
      ).map(item => ({
        productId: item.productId || item.product_id,
        quantity: item.quantity || 1,
      }))

      if (validItems.length === 0) {
        throw new APIError('No valid items found', 400)
      }

      if (validItems.length > 100) {
        throw new APIError('Maximum 100 items allowed per request', 400)
      }

      // Check bulk stock availability
      const bulkResult = await checkBulkStockAvailability(req.payload, validItems)

      const isAdmin = req.user.role === 'admin'

      interface BulkStockResponse {
        success: boolean
        data: {
          allAvailable: boolean
          totalItems: number
          availableItems: number
          unavailableItems: number
          unavailableProducts: unknown[]
          detailedResults?: unknown[]
        }
      }

      const response: BulkStockResponse = {
        success: true,
        data: {
          allAvailable: bulkResult.allAvailable,
          totalItems: validItems.length,
          availableItems: validItems.length - bulkResult.unavailableProducts.length,
          unavailableItems: bulkResult.unavailableProducts.length,
          unavailableProducts: bulkResult.unavailableProducts,
        },
      }

      // Include detailed results for admin users
      if (isAdmin) {
        response.data.detailedResults = bulkResult.results
      }

      return Response.json(response)
    } catch (error) {
      req.payload.logger.error(`Bulk stock check error: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Bulk stock check failed' },
        { status: 500 }
      )
    }
  },
}

/**
 * Real-time stock monitoring for admin dashboard
 * GET /api/stock/monitor
 */
export const stockMonitor: Endpoint = {
  path: '/stock/monitor',
  method: 'get',
  handler: async (req) => {
    try {
      // Admin access required
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      // Get real-time stock statistics
      const [
        totalInventoryResult,
        lowStockResult,
      ] = await Promise.all([
        // Total inventory (items)
        req.payload.find({
          collection: 'inventory',
          limit: 10000,
        }),

        // Low stock items (sample)
        req.payload.find({
          collection: 'inventory',
          limit: 1000,
          // NOTE: Ideal would be filtering by quantity <= low_stock_threshold at DB level,
          // but generic Payload filtering might be complex with field references;
          // for now fetching all (up to limit) and filtering in code is safe for MVP scale.
        }),
      ])

      // Calculate stock statistics
      let lowStockCount = 0
      let criticalStockCount = 0

      // Simplified analysis
      const lowStockItems = lowStockResult.docs.filter((inventory) => {
        const qty = inventory.quantity || 0
        const threshold = inventory.low_stock_threshold || 0
        return qty <= threshold
      })

      lowStockItems.forEach((inventory) => {
        const qty = inventory.quantity || 0
        const threshold = inventory.low_stock_threshold || 10 // default 10 if missing
        lowStockCount++
        if (qty <= threshold * 0.5) {
          criticalStockCount++
        }
      })

      const monitoringData = {
        timestamp: new Date().toISOString(),
        stockSummary: {
          totalBatches: totalInventoryResult.totalDocs, // "Items"
          totalValue: "0.00", // Value calculation removed (no cost price)
          lowStockItems: lowStockCount,
          criticalStockItems: criticalStockCount,
          expiredBatches: 0,
          expiringSoonBatches: 0,
        },
        recentActivity: {
          last24Hours: {},
          recentMovements: [], // Disabled
        },
        alerts: [] as Array<{
          type: 'critical' | 'warning' | 'info'
          message: string
          count?: number
        }>,
      }

      // Generate alerts
      if (criticalStockCount > 0) {
        monitoringData.alerts.push({
          type: 'critical',
          message: 'Products with critically low stock',
          count: criticalStockCount,
        })
      }

      if (lowStockCount > criticalStockCount) {
        monitoringData.alerts.push({
          type: 'warning',
          message: 'Products with low stock',
          count: lowStockCount - criticalStockCount,
        })
      }

      return Response.json({
        success: true,
        data: monitoringData,
      })
    } catch (error) {
      req.payload.logger.error(`Stock monitoring error: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Stock monitoring failed' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get stock alerts and notifications
 * GET /api/stock/alerts
 */
export const stockAlerts: Endpoint = {
  path: '/stock/alerts',
  method: 'get',
  handler: async (req) => {
    try {
      // Admin access required
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      const severity = req.query.severity as string // 'critical', 'warning', 'info'
      const limit = parseInt(req.query.limit as string) || 50

      const alerts: Array<{
        id: string
        type: 'low_stock' | 'out_of_stock'
        severity: 'critical' | 'warning' | 'info'
        title: string
        message: string
        productId?: string | number
        productName?: string
        currentQuantity?: number
        minimumLevel?: number
        timestamp: string
      }> = []

      // Get low stock and out of stock items
      // Fetch all inventory (assuming reasonably sized for MVP)
      const inventoryResult = await req.payload.find({
        collection: 'inventory',
        limit: 1000,
        depth: 1,
      })

      for (const inventory of inventoryResult.docs) {
        const available = inventory.quantity || 0
        const minimum = inventory.low_stock_threshold || 10
        const productName = typeof inventory.product === 'object' ? inventory.product.title : String(inventory.product)
        const productId = typeof inventory.product === 'object' ? inventory.product.id : inventory.product

        // Out of stock alerts
        if (available <= 0) {
          alerts.push({
            id: `out_of_stock_${inventory.id}`,
            type: 'out_of_stock',
            severity: 'critical',
            title: 'Out of Stock',
            message: `${productName} is out of stock`,
            productId,
            productName,
            currentQuantity: available,
            minimumLevel: minimum,
            timestamp: new Date().toISOString(),
          })
        }
        // Critical low stock (50% or less of minimum)
        else if (available <= minimum * 0.5) {
          alerts.push({
            id: `critical_low_stock_${inventory.id}`,
            type: 'low_stock',
            severity: 'critical',
            title: 'Critical Low Stock',
            message: `${productName} has critically low stock: ${available} remaining (minimum: ${minimum})`,
            productId,
            productName,
            currentQuantity: available,
            minimumLevel: minimum,
            timestamp: new Date().toISOString(),
          })
        }
        // Low stock warning
        else if (available <= minimum) {
          alerts.push({
            id: `low_stock_${inventory.id}`,
            type: 'low_stock',
            severity: 'warning',
            title: 'Low Stock',
            message: `${productName} is below minimum stock level: ${available} remaining (minimum: ${minimum})`,
            productId,
            productName,
            currentQuantity: available,
            minimumLevel: minimum,
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Filter by severity if specified
      let filteredAlerts = alerts
      if (severity && ['critical', 'warning', 'info'].includes(severity)) {
        filteredAlerts = alerts.filter(alert => alert.severity === severity)
      }

      // Sort by severity (critical first) and limit results
      filteredAlerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })

      const limitedAlerts = filteredAlerts.slice(0, limit)

      return Response.json({
        success: true,
        data: limitedAlerts,
        meta: {
          total: filteredAlerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          info: alerts.filter(a => a.severity === 'info').length,
          limit,
          severity,
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error(`Stock alerts error: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Failed to retrieve stock alerts' },
        { status: 500 }
      )
    }
  },
}