import type { Payload } from 'payload'

/**
 * Prescription validation utilities
 * Requirements: 5.1, 8.1 - Prescription validation utilities
 */

export interface PrescriptionValidationResult {
  isValid: boolean
  requiresPrescription: boolean
  isVerified: boolean
  prescriptionProducts: Array<{
    productId: string | number
    productName: string
    genericName?: string
    requiresPrescription: boolean
  }>
  errors: string[]
  warnings: string[]
  verificationDetails?: {
    verifiedBy?: string | number
    verifiedAt?: string
    verifierName?: string
  }
}

export interface PrescriptionVerificationResult {
  success: boolean
  message: string
  orderId: string | number
  verifiedBy: string | number
  verifiedAt: string
  errors?: string[]
}

/**
 * Validate prescription requirements for an order
 * Checks if order contains prescription items and validates verification status
 */
export async function validateOrderPrescription(
  payload: Payload,
  orderId: string | number
): Promise<PrescriptionValidationResult> {
  try {
    // Get the order with populated product data
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    })

    if (!order) {
      return {
        isValid: false,
        requiresPrescription: false,
        isVerified: false,
        prescriptionProducts: [],
        errors: ['Order not found'],
        warnings: [],
      }
    }

    const errors: string[] = []
    const warnings: string[] = []
    const prescriptionProducts: PrescriptionValidationResult['prescriptionProducts'] = []
    let requiresPrescription = false

    // Check each item in the order
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item && typeof item === 'object' && 'product' in item) {
          const product = typeof item.product === 'object' ? item.product : null
          
          if (product) {
            const productInfo = {
              productId: product.id,
              productName: product.title || String(product.id),
              genericName: product.generic_name || undefined,
              requiresPrescription: product.requires_prescription || false,
            }

            prescriptionProducts.push(productInfo)

            if (product.requires_prescription) {
              requiresPrescription = true
            }
          }
        }
      }
    }

    // Validate prescription verification if required
    const isVerified = order.prescription_verified || false
    let verificationDetails: PrescriptionValidationResult['verificationDetails']

    if (requiresPrescription) {
      if (!isVerified) {
        errors.push('Prescription verification is required for this order')
      } else {
        // Get verifier details if available
        if (order.verified_by) {
          try {
            const verifier = await payload.findByID({
              collection: 'users',
              id: typeof order.verified_by === 'object' ? order.verified_by.id : order.verified_by,
            })

            verificationDetails = {
              verifiedBy: verifier.id,
              verifiedAt: order.updatedAt,
              verifierName: verifier.name || verifier.email,
            }
          } catch (verifierError) {
            warnings.push('Could not retrieve verifier information')
          }
        }
      }

      // Check order status compatibility
      if (['processing', 'shipped', 'delivered'].includes(order.status || '')) {
        if (!isVerified) {
          errors.push(
            `Order status "${order.status}" requires prescription verification for prescription items`
          )
        }
      }
    } else {
      // If no prescription required, these fields should be clear
      if (isVerified) {
        warnings.push('Prescription verification is set but no prescription items found')
      }
    }

    // Validate prescription notes if provided
    if (order.prescription_notes && !requiresPrescription) {
      warnings.push('Prescription notes provided but no prescription items in order')
    }

    return {
      isValid: errors.length === 0,
      requiresPrescription,
      isVerified,
      prescriptionProducts,
      errors,
      warnings,
      verificationDetails,
    }
  } catch (error) {
    payload.logger.error(
      `Error validating order prescription ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      isValid: false,
      requiresPrescription: false,
      isVerified: false,
      prescriptionProducts: [],
      errors: [`Prescription validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    }
  }
}

/**
 * Verify prescription for an order (admin only)
 * Updates order with prescription verification details
 */
export async function verifyOrderPrescription(
  payload: Payload,
  orderId: string | number,
  verifierId: string | number,
  notes?: string
): Promise<PrescriptionVerificationResult> {
  try {
    // Validate that the verifier is an admin
    const verifier = await payload.findByID({
      collection: 'users',
      id: verifierId,
    })

    if (!verifier || !verifier.roles?.includes('admin')) {
      return {
        success: false,
        message: 'Only administrators can verify prescriptions',
        orderId,
        verifiedBy: verifierId,
        verifiedAt: new Date().toISOString(),
        errors: ['Insufficient permissions - admin role required'],
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
        message: 'Order not found',
        orderId,
        verifiedBy: verifierId,
        verifiedAt: new Date().toISOString(),
        errors: ['Order not found'],
      }
    }

    // Validate that the order requires prescription
    const prescriptionValidation = await validateOrderPrescription(payload, orderId)
    
    if (!prescriptionValidation.requiresPrescription) {
      return {
        success: false,
        message: 'Order does not contain prescription items',
        orderId,
        verifiedBy: verifierId,
        verifiedAt: new Date().toISOString(),
        errors: ['No prescription items found in order'],
      }
    }

    if (prescriptionValidation.isVerified) {
      return {
        success: false,
        message: 'Prescription already verified',
        orderId,
        verifiedBy: verifierId,
        verifiedAt: new Date().toISOString(),
        errors: ['Prescription has already been verified'],
      }
    }

    const verifiedAt = new Date().toISOString()

    // Update the order with prescription verification
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        prescription_verified: true,
        verified_by: Number(verifierId),
        prescription_notes: notes || order.prescription_notes,
      },
      overrideAccess: true, // Admin operation
    })

    payload.logger.info(
      `Prescription verified for order ${orderId} by admin ${verifier.email} (${verifierId})`
    )

    return {
      success: true,
      message: `Prescription verified successfully by ${verifier.name || verifier.email}`,
      orderId,
      verifiedBy: verifierId,
      verifiedAt,
    }
  } catch (error) {
    payload.logger.error(
      `Error verifying prescription for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      success: false,
      message: 'Prescription verification failed',
      orderId,
      verifiedBy: verifierId,
      verifiedAt: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Remove prescription verification from an order (admin only)
 * Used for correcting verification errors
 */
export async function removePrescriptionVerification(
  payload: Payload,
  orderId: string | number,
  adminId: string | number,
  reason?: string
): Promise<PrescriptionVerificationResult> {
  try {
    // Validate that the admin has permission
    const admin = await payload.findByID({
      collection: 'users',
      id: adminId,
    })

    if (!admin || !admin.roles?.includes('admin')) {
      return {
        success: false,
        message: 'Only administrators can modify prescription verification',
        orderId,
        verifiedBy: adminId,
        verifiedAt: new Date().toISOString(),
        errors: ['Insufficient permissions - admin role required'],
      }
    }

    // Get the order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        orderId,
        verifiedBy: adminId,
        verifiedAt: new Date().toISOString(),
        errors: ['Order not found'],
      }
    }

    if (!order.prescription_verified) {
      return {
        success: false,
        message: 'Prescription is not currently verified',
        orderId,
        verifiedBy: adminId,
        verifiedAt: new Date().toISOString(),
        errors: ['No prescription verification to remove'],
      }
    }

    // Check if order status allows verification removal
    if (['shipped', 'delivered'].includes(order.status || '')) {
      return {
        success: false,
        message: `Cannot remove prescription verification for order with status: ${order.status}`,
        orderId,
        verifiedBy: adminId,
        verifiedAt: new Date().toISOString(),
        errors: [`Order status "${order.status}" does not allow verification changes`],
      }
    }

    const removedAt = new Date().toISOString()

    // Update the order to remove prescription verification
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        prescription_verified: false,
        verified_by: undefined,
        prescription_notes: reason 
          ? `${order.prescription_notes || ''}\n\nVerification removed by ${admin.email}: ${reason}`.trim()
          : order.prescription_notes,
      },
      overrideAccess: true, // Admin operation
    })

    payload.logger.info(
      `Prescription verification removed for order ${orderId} by admin ${admin.email} (${adminId}). Reason: ${reason || 'No reason provided'}`
    )

    return {
      success: true,
      message: `Prescription verification removed by ${admin.name || admin.email}`,
      orderId,
      verifiedBy: adminId,
      verifiedAt: removedAt,
    }
  } catch (error) {
    payload.logger.error(
      `Error removing prescription verification for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`
    )

    return {
      success: false,
      message: 'Failed to remove prescription verification',
      orderId,
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Get all orders requiring prescription verification
 * Useful for admin dashboard and workflow management
 */
export async function getOrdersRequiringPrescriptionVerification(
  payload: Payload,
  options: {
    limit?: number
    status?: string[]
    includeVerified?: boolean
  } = {}
): Promise<
  Array<{
    orderId: string | number
    customerName: string
    customerEmail: string
    orderDate: string
    status: string
    totalAmount: number
    prescriptionProducts: string[]
    isVerified: boolean
    verifiedBy?: string
    daysWaiting: number
  }>
> {
  try {
    const { limit = 50, status = ['pending', 'confirmed'], includeVerified = false } = options

    // Build query conditions
    const whereConditions: any[] = [
      { prescription_required: { equals: true } },
    ]

    if (!includeVerified) {
      whereConditions.push({ prescription_verified: { not_equals: true } })
    }

    if (status.length > 0) {
      whereConditions.push({ status: { in: status } })
    }

    const ordersResult = await payload.find({
      collection: 'orders',
      where: {
        and: whereConditions,
      },
      sort: '-createdAt',
      limit,
      depth: 2,
    })

    const currentDate = new Date()

    return ordersResult.docs.map((order) => {
      const orderDate = new Date(order.createdAt)
      const daysWaiting = Math.floor((currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

      // Extract prescription product names
      const prescriptionProducts = (order.items || [])
        .filter((item) => {
          const product = typeof item.product === 'object' ? item.product : null
          return product?.requires_prescription
        })
        .map((item) => {
          const product = typeof item.product === 'object' ? item.product : null
          return product?.title || 'Unknown Product'
        })

      // Get customer info
      const customer = typeof order.customer === 'object' ? order.customer : null
      const customerName = customer?.name || customer?.email || 'Unknown Customer'
      const customerEmail = customer?.email || 'unknown@example.com'

      return {
        orderId: order.id,
        customerName,
        customerEmail,
        orderDate: order.createdAt,
        status: order.status || 'unknown',
        totalAmount: order.amount || 0,
        prescriptionProducts,
        isVerified: order.prescription_verified || false,
        verifiedBy: order.verified_by ? String(order.verified_by) : undefined,
        daysWaiting,
      }
    })
  } catch (error) {
    payload.logger.error(
      `Error getting orders requiring prescription verification: ${error instanceof Error ? error.message : String(error)}`
    )
    return []
  }
}