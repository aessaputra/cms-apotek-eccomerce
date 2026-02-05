/**
 * Pharmacy-specific utility functions
 * Centralized exports for all pharmacy business logic utilities
 * Requirements: 4.5, 5.1, 8.1 - Core business logic functions
 */

// Stock availability utilities
export {
  checkBulkStockAvailability, checkStockAvailability, type StockAvailabilityResult
} from './stockAvailability'

// Order processing utilities
export {
  cancelOrder,
  getOrderProcessingStatus, processOrderConfirmation, validateOrder, type OrderProcessingResult, type OrderValidationResult
} from './orderProcessing'

// Prescription validation utilities
export {
  getOrdersRequiringPrescriptionVerification, removePrescriptionVerification, validateOrderPrescription,
  verifyOrderPrescription, type PrescriptionValidationResult,
  type PrescriptionVerificationResult
} from './prescriptionValidation'

// Stock management utilities
export {
  calculateInventoryValuation,
  generateStockOptimizationRecommendations,
  getExpiringProducts,
  getLowStockProducts,
  type ExpiringProduct,
  type InventoryValuation,
  type LowStockProduct,
  type StockOptimizationRecommendation
} from './stockManagement'

// Reporting utilities
export {
  generateFinancialReport,
  generateInventoryStatusReport,
  generatePrescriptionTrackingReport,
  generateSalesReport,
  type FinancialReport,
  type InventoryStatusReport,
  type PrescriptionTrackingReport,
  type SalesReport
} from './reportingUtilities'

/**
 * Comprehensive pharmacy utilities for common operations
 */

import type { Payload } from 'payload'
import { checkStockAvailability } from './stockAvailability'

/**
 * Quick health check for pharmacy operations
 * Provides overview of system status
 */
export async function getPharmacySystemStatus(payload: Payload): Promise<{
  stockStatus: {
    totalProducts: number
    lowStockProducts: number
    expiredBatches: number
  }
  orderStatus: {
    pendingOrders: number
    awaitingPrescriptionVerification: number
    processingOrders: number
  }
  systemHealth: 'healthy' | 'warning' | 'critical'
  lastChecked: string
}> {
  try {
    // Get stock statistics
    const [
      totalProductsResult,
      lowStockResult,
      pendingOrdersResult,
      prescriptionOrdersResult,
      processingOrdersResult,
    ] = await Promise.all([
      // Total active products
      payload.find({
        collection: 'products',
        where: { is_active: { equals: true } },
        limit: 1,
      }),

      // Low stock inventory items
      payload.find({
        collection: 'inventory',
        where: {
          // We'll filter strictly by threshold in code if needed, 
          // but for count we can just get all active ones and filter
          // or we could assume we just want to count them.
          // Simplified: Fetch all and count low stock in code for accuracy
          // as simple querying might be tricky with field comparison (quantity <= threshold) in some DBs/adapters.
          // But simplified schema has low_stock_threshold.
          // Let's just fetch all inventory for active products ideally. 
          // Since we don't have is_active on inventory anymore (it's on product),
          // we rely on product relationship.
        },
        limit: 5000,
      }),

      // Pending orders
      payload.find({
        collection: 'orders',
        where: { status: { equals: 'pending' } },
        limit: 1,
      }),

      // Orders awaiting prescription verification
      payload.find({
        collection: 'orders',
        where: {
          and: [
            { prescription_required: { equals: true } },
            { prescription_verified: { not_equals: true } },
          ],
        },
        limit: 1,
      }),

      // Processing orders
      payload.find({
        collection: 'orders',
        where: { status: { equals: 'processing' } },
        limit: 1,
      }),
    ])

    // Calculate low stock count
    let lowStockCount = 0
    for (const inventory of lowStockResult.docs) {
      const quantity = (inventory.quantity || 0)
      const threshold = (inventory.low_stock_threshold || 10)
      if (quantity <= threshold) {
        lowStockCount++
      }
    }

    const stockStatus = {
      totalProducts: totalProductsResult.totalDocs,
      lowStockProducts: lowStockCount,
      expiredBatches: 0, // Expiry removed
    }

    const orderStatus = {
      pendingOrders: pendingOrdersResult.totalDocs,
      awaitingPrescriptionVerification: prescriptionOrdersResult.totalDocs,
      processingOrders: processingOrdersResult.totalDocs,
    }

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Adjusted thresholds
    if (orderStatus.awaitingPrescriptionVerification > 20) {
      systemHealth = 'critical'
    } else if (stockStatus.lowStockProducts > 10 || orderStatus.pendingOrders > 10) {
      systemHealth = 'warning'
    }

    return {
      stockStatus,
      orderStatus,
      systemHealth,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    payload.logger.error(
      `Error getting pharmacy system status: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      stockStatus: {
        totalProducts: 0,
        lowStockProducts: 0,
        expiredBatches: 0,
      },
      orderStatus: {
        pendingOrders: 0,
        awaitingPrescriptionVerification: 0,
        processingOrders: 0,
      },
      systemHealth: 'critical',
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Validate product availability for immediate purchase
 * Quick check for product page display
 */
export async function validateProductAvailability(
  payload: Payload,
  productId: string | number,
  quantity: number = 1
): Promise<{
  isAvailable: boolean
  availableQuantity: number
  message: string
  requiresPrescription: boolean
  prescriptionVerified?: boolean
}> {
  try {
    // Check stock availability
    const stockResult = await checkStockAvailability(payload, productId, quantity)

    // Get product details
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!product || !(product as any).is_active) {
      return {
        isAvailable: false,
        availableQuantity: 0,
        message: product ? 'Product is not available' : 'Product not found',
        requiresPrescription: product?.requires_prescription || false,
      }
    }

    let message = 'Available'
    if (!stockResult.isAvailable) {
      message = stockResult.quantity === 0
        ? 'Out of stock'
        : `Only ${stockResult.quantity} available`
    } else if (stockResult.quantity < quantity * 2) {
      message = 'Limited stock available'
    }

    return {
      isAvailable: stockResult.isAvailable,
      availableQuantity: stockResult.quantity,
      message,
      requiresPrescription: product.requires_prescription || false,
    }
  } catch (error) {
    payload.logger.error(
      `Error validating product availability ${productId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      isAvailable: false,
      availableQuantity: 0,
      message: 'Unable to check availability',
      requiresPrescription: false,
    }
  }
}