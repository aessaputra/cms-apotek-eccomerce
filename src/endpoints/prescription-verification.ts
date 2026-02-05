import {
  getOrdersRequiringPrescriptionVerification,
  removePrescriptionVerification,
  validateOrderPrescription,
  verifyOrderPrescription,
} from '@/utilities/prescriptionValidation'
import type { Endpoint, Where } from 'payload'
import { APIError } from 'payload'

/**
 * Prescription verification endpoints
 * Requirements: 8.4, 8.5 - Prescription verification endpoints
 */

/**
 * Get orders requiring prescription verification
 * GET /api/prescriptions/pending
 */
export const pendingPrescriptionOrders: Endpoint = {
  path: '/prescriptions/pending',
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

      // Parse query parameters
      const limit = parseInt(req.query.limit as string) || 50
      const status = req.query.status ? (req.query.status as string).split(',') : ['pending', 'confirmed']
      const includeVerified = req.query.includeVerified === 'true'

      // Get orders requiring prescription verification
      const orders = await getOrdersRequiringPrescriptionVerification(req.payload, {
        limit,
        status,
        includeVerified,
      })

      // Calculate summary statistics
      const summary = {
        totalOrders: orders.length,
        unverifiedOrders: orders.filter(order => !order.isVerified).length,
        verifiedOrders: orders.filter(order => order.isVerified).length,
        averageWaitingDays: orders.length > 0
          ? Math.round(orders.reduce((sum, order) => sum + order.daysWaiting, 0) / orders.length)
          : 0,
        oldestWaitingDays: orders.length > 0
          ? Math.max(...orders.map(order => order.daysWaiting))
          : 0,
      }

      return Response.json({
        success: true,
        data: orders,
        summary,
        meta: {
          limit,
          status,
          includeVerified,
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      req.payload.logger.error(`Pending prescription orders error: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Failed to retrieve pending prescription orders' },
        { status: 500 }
      )
    }
  },
}

/**
 * Validate prescription requirements for an order
 * GET /api/prescriptions/validate/:orderId
 */
export const validatePrescription: Endpoint = {
  path: '/prescriptions/validate/:orderId',
  method: 'get',
  handler: async (req) => {
    const orderId = req.routeParams?.orderId as string

    try {
      if (!orderId) {
        throw new APIError('Order ID is required', 400)
      }

      // Authentication required
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      // Users can validate their own orders, admins can validate any order
      const isAdmin = req.user.role === 'admin'

      if (!isAdmin) {
        // Check if user owns the order
        const order = await req.payload.findByID({
          collection: 'orders',
          id: orderId,
        })

        if (!order) {
          throw new APIError('Order not found', 404)
        }

        const orderUserId = typeof order.customer === 'object' && order.customer ? order.customer.id : order.customer
        if (orderUserId !== req.user.id) {
          throw new APIError('Access denied - you can only validate your own orders', 403)
        }
      }

      // Validate prescription requirements
      const validation = await validateOrderPrescription(req.payload, orderId)

      return Response.json({
        success: true,
        data: validation,
        meta: {
          orderId,
          validatedAt: new Date().toISOString(),
          validatedBy: req.user.id,
        },
      })
    } catch (error) {
      req.payload.logger.error(`Prescription validation error for order ${orderId}: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Prescription validation failed' },
        { status: 500 }
      )
    }
  },
}

/**
 * Verify prescription for an order (admin only)
 * POST /api/prescriptions/verify/:orderId
 */
export const verifyPrescription: Endpoint = {
  path: '/prescriptions/verify/:orderId',
  method: 'post',
  handler: async (req) => {
    const orderId = req.routeParams?.orderId as string

    try {
      if (!orderId) {
        throw new APIError('Order ID is required', 400)
      }

      // Admin access required
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required - only administrators can verify prescriptions', 403)
      }

      // Body parser for JSON
      let body: Record<string, unknown> = {}
      try {
        if (req.json) {
          body = await req.json()
        }
      } catch {
        // Ignore parsing errors, use empty object
      }
      const notes = typeof body.notes === 'string' ? body.notes : undefined

      // Verify the prescription
      const result = await verifyOrderPrescription(req.payload, orderId, req.user.id, notes)

      if (result.success) {
        return Response.json({
          success: true,
          data: result,
          message: result.message,
        })
      } else {
        return Response.json(
          {
            success: false,
            error: result.message,
            errors: result.errors,
          },
          { status: 400 }
        )
      }
    } catch (error) {
      req.payload.logger.error(`Prescription verification error for order ${orderId}: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Prescription verification failed' },
        { status: 500 }
      )
    }
  },
}

/**
 * Remove prescription verification (admin only)
 * DELETE /api/prescriptions/verify/:orderId
 */
export const removePrescriptionVerify: Endpoint = {
  path: '/prescriptions/verify/:orderId',
  method: 'delete',
  handler: async (req) => {
    const orderId = req.routeParams?.orderId as string

    try {
      if (!orderId) {
        throw new APIError('Order ID is required', 400)
      }

      // Admin access required
      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      if (req.user.role !== 'admin') {
        throw new APIError('Admin access required - only administrators can modify prescription verification', 403)
      }

      // Parse request body for reason
      let body: Record<string, unknown> = {}
      try {
        if (req.json) {
          body = await req.json()
        }
      } catch {
        // Ignore parsing errors, use empty object
      }
      const reason = typeof body.reason === 'string' ? body.reason : undefined

      // Remove prescription verification
      const result = await removePrescriptionVerification(req.payload, orderId, req.user.id, reason)

      if (result.success) {
        return Response.json({
          success: true,
          data: result,
          message: result.message,
        })
      } else {
        return Response.json(
          {
            success: false,
            error: result.message,
            errors: result.errors,
          },
          { status: 400 }
        )
      }
    } catch (error) {
      req.payload.logger.error(`Remove prescription verification error for order ${orderId}: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Failed to remove prescription verification' },
        { status: 500 }
      )
    }
  },
}

/**
 * Get prescription verification statistics
 * GET /api/prescriptions/stats
 */
export const prescriptionStats: Endpoint = {
  path: '/prescriptions/stats',
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

      // Parse query parameters for date range
      const startDate = req.query.startDate as string
      const endDate = req.query.endDate as string

      // Build date filter
      const dateFilter: Where[] = []
      if (startDate) {
        dateFilter.push({ createdAt: { greater_than_equal: startDate } })
      }
      if (endDate) {
        dateFilter.push({ createdAt: { less_than_equal: endDate } })
      }

      const whereConditions = [
        { prescription_required: { equals: true } },
        ...(dateFilter.length > 0 ? dateFilter : []),
      ]

      // Get prescription order statistics
      const [
        totalPrescriptionOrdersResult,
        verifiedOrdersResult,
        unverifiedOrdersResult,
        pendingOrdersResult,
        processingOrdersResult,
      ] = await Promise.all([
        // Total prescription orders
        req.payload.find({
          collection: 'orders',
          where: { and: whereConditions },
          limit: 1,
        }),

        // Verified prescription orders
        req.payload.find({
          collection: 'orders',
          where: {
            and: [
              ...whereConditions,
              { prescription_verified: { equals: true } },
            ],
          },
          limit: 1,
        }),

        // Unverified prescription orders
        req.payload.find({
          collection: 'orders',
          where: {
            and: [
              ...whereConditions,
              { prescription_verified: { not_equals: true } },
            ],
          },
          limit: 1,
        }),

        // Pending prescription orders
        req.payload.find({
          collection: 'orders',
          where: {
            and: [
              ...whereConditions,
              { status: { equals: 'pending' } },
              { prescription_verified: { not_equals: true } },
            ],
          },
          limit: 1,
        }),

        // Processing prescription orders
        req.payload.find({
          collection: 'orders',
          where: {
            and: [
              ...whereConditions,
              { status: { equals: 'processing' } },
            ],
          },
          limit: 1,
        }),
      ])

      // Get verification performance metrics
      const recentVerifications = await req.payload.find({
        collection: 'orders',
        where: {
          and: [
            { prescription_required: { equals: true } },
            { prescription_verified: { equals: true } },
            { updatedAt: { greater_than: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() } },
          ],
        },
        sort: '-updatedAt',
        limit: 100,
        depth: 1,
      })

      // Calculate average verification time
      let totalVerificationTime = 0
      let verificationCount = 0

      for (const order of recentVerifications.docs) {
        const createdAt = new Date(order.createdAt)
        const updatedAt = new Date(order.updatedAt)
        const verificationTime = updatedAt.getTime() - createdAt.getTime()

        if (verificationTime > 0) {
          totalVerificationTime += verificationTime
          verificationCount++
        }
      }

      const averageVerificationTimeHours = verificationCount > 0
        ? Math.round((totalVerificationTime / verificationCount) / (1000 * 60 * 60))
        : 0

      // Get top verifiers
      const verifierStats: Record<string, { count: number; name: string }> = {}

      for (const order of recentVerifications.docs) {
        if (order.verified_by) {
          const verifierId = typeof order.verified_by === 'object' ? order.verified_by.id : order.verified_by
          const verifierName = typeof order.verified_by === 'object'
            ? (order.verified_by.full_name || order.verified_by.email)
            : String(verifierId)

          if (!verifierStats[verifierId]) {
            verifierStats[verifierId] = { count: 0, name: verifierName }
          }
          verifierStats[verifierId].count++
        }
      }

      const topVerifiers = Object.entries(verifierStats)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([id, stats]) => ({
          verifierId: id,
          verifierName: stats.name,
          verificationsCount: stats.count,
        }))

      const stats = {
        overview: {
          totalPrescriptionOrders: totalPrescriptionOrdersResult.totalDocs,
          verifiedOrders: verifiedOrdersResult.totalDocs,
          unverifiedOrders: unverifiedOrdersResult.totalDocs,
          pendingVerification: pendingOrdersResult.totalDocs,
          processingOrders: processingOrdersResult.totalDocs,
          verificationRate: totalPrescriptionOrdersResult.totalDocs > 0
            ? ((verifiedOrdersResult.totalDocs / totalPrescriptionOrdersResult.totalDocs) * 100).toFixed(1)
            : '0.0',
        },
        performance: {
          averageVerificationTimeHours,
          recentVerifications: recentVerifications.docs.length,
          topVerifiers,
        },
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present',
        },
      }

      return Response.json({
        success: true,
        data: stats,
        meta: {
          generatedAt: new Date().toISOString(),
          period: startDate && endDate ? 'custom' : 'all_time',
        },
      })
    } catch (error) {
      req.payload.logger.error(`Prescription stats error: ${error}`)

      if (error instanceof APIError) {
        return Response.json(
          { success: false, error: error.message },
          { status: error.status }
        )
      }

      return Response.json(
        { success: false, error: 'Failed to retrieve prescription statistics' },
        { status: 500 }
      )
    }
  },
}