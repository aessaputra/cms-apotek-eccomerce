import { getPharmacySystemStatus } from '@/utilities/pharmacy'
import { generateFinancialReport, generateInventoryStatusReport, generateSalesReport } from '@/utilities/reportingUtilities'
import { getLowStockProducts } from '@/utilities/stockAvailability'
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

/**
 * Inventory reporting endpoints
 */

/**
 * Get low stock products report
 * GET /api/inventory/low-stock
 */
export const lowStockReport: Endpoint = {
  path: '/inventory/low-stock',
  method: 'get',
  handler: async (req) => {
    try {
      // Check authentication and admin role
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      // Parse query parameters
      const limit = parseInt(req.query.limit as string) || 50
      // includeExpiringSoon ignored

      // Get low stock products
      const lowStockProducts = await getLowStockProducts(req.payload, {
        limit,
      })

      return Response.json({
        success: true,
        data: lowStockProducts,
        meta: {
          total: lowStockProducts.length,
          limit,
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error('Low stock report error: ' + error)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get expiring products report - DEPRECATED / STUBBED
 * GET /api/inventory/expiring
 */
export const expiringProductsReport: Endpoint = {
  path: '/inventory/expiring',
  method: 'get',
  handler: async () => {
    try {
      // Return empty result as expiry is disabled
      return Response.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          generatedAt: new Date().toISOString(),
          message: "Expiry tracking disabled in simplified schema"
        },
      })
    } catch (_error) {
      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get comprehensive inventory status report
 * GET /api/inventory/status
 */
export const inventoryStatusReport: Endpoint = {
  path: '/inventory/status',
  method: 'get',
  handler: async (req) => {
    try {
      // Check authentication and admin role
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      // Get comprehensive system status
      const systemStatus = await getPharmacySystemStatus(req.payload)

      // Get additional inventory statistics
      const [
        totalInventoryResult,
        lowStockResult,
      ] = await Promise.all([
        // Total inventory items
        req.payload.find({
          collection: 'inventory',
          limit: 1,
        }),

        // Get sample of low stock items for details
        getLowStockProducts(req.payload, { limit: 10 }),
      ])

      const inventoryStats = {
        totalBatches: totalInventoryResult.totalDocs, // "Batches" acts as "Items" now
        activeBatches: totalInventoryResult.totalDocs, // Simplified assumption
        expiredBatches: 0,
        lowStockItems: lowStockResult.length,
        expirationRate: '0.00',
      }

      return Response.json({
        success: true,
        data: {
          systemStatus,
          inventoryStats,
          lowStockSample: lowStockResult.slice(0, 5), // Top 5 low stock items
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error(`Inventory status report error: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get inventory movements report - DEPRECATED / STUBBED
 * GET /api/inventory/movements
 */
export const inventoryMovementsReport: Endpoint = {
  path: '/inventory/movements',
  method: 'get',
  handler: async () => {
    // Return empty result as movements are disabled
    return Response.json({
      success: true,
      data: [],
      summary: {
        totalMovements: 0,
        movementTypes: {},
        totalQuantityIn: 0,
        totalQuantityOut: 0
      },
      meta: {
        total: 0,
        generatedAt: new Date().toISOString(),
        message: "Inventory movements tracking disabled in simplified schema"
      },
    })
  },
}

/**
 * Get comprehensive sales report
 * GET /api/reports/sales
 */
export const salesReport: Endpoint = {
  path: '/reports/sales',
  method: 'get',
  handler: async (req) => {
    try {
      // Check authentication and admin role
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      // Parse query parameters
      const startDate = req.query.startDate as string
      const endDate = req.query.endDate as string
      const periodType = req.query.periodType as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
      const categoryId = req.query.categoryId as string

      if (!startDate || !endDate) {
        throw new APIError('Start date and end date are required', 400)
      }

      // Generate sales report
      const report = await generateSalesReport(req.payload, {
        startDate,
        endDate,
        periodType,
        categoryId,
      })

      return Response.json({
        success: true,
        data: report,
        meta: {
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error('Sales report error: ' + error)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get comprehensive inventory status report
 * GET /api/reports/inventory-status
 */
export const inventoryStatusReportEndpoint: Endpoint = {
  path: '/reports/inventory-status',
  method: 'get',
  handler: async (req) => {
    try {
      // Check authentication and admin role
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      // Parse query parameters
      const categoryId = req.query.categoryId as string

      // Generate inventory status report
      const report = await generateInventoryStatusReport(req.payload, {
        categoryId,
      })

      return Response.json({
        success: true,
        data: report,
        meta: {
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error('Inventory status report endpoint error: ' + error)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get financial report
 * GET /api/reports/financial
 */
export const financialReport: Endpoint = {
  path: '/reports/financial',
  method: 'get',
  handler: async (req) => {
    try {
      // Check authentication and admin role
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required', 403)
      }

      // Parse query parameters
      const startDate = req.query.startDate as string
      const endDate = req.query.endDate as string


      if (!startDate || !endDate) {
        throw new APIError('Start date and end date are required', 400)
      }

      // Generate financial report
      const report = await generateFinancialReport(req.payload, {
        startDate,
        endDate,
      })

      return Response.json({
        success: true,
        data: report,
        meta: {
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error('Financial report error: ' + error)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
}