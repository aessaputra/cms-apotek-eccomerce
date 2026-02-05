/**
 * Data Integrity Hooks
 * 
 * Collection hooks that enforce data integrity and consistency
 * across all pharmacy-related operations.
 */

import { validateAddressIntegrity, validateInventoryQuantities } from '@/utilities/dataIntegrity'
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

/**
 * Validates inventory data integrity before any changes
 */
export const validateInventoryIntegrity: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  // Skip validation during seeding or if explicitly disabled
  if (req.context?.skipValidation || req.context?.disableRevalidate) {
    return data
  }

  try {
    // Validate quantity constraints
    if (data.quantity !== undefined && data.quantity < 0) {
      throw new Error('Quantity cannot be negative')
    }

    if (data.low_stock_threshold !== undefined && data.low_stock_threshold < 0) {
      throw new Error('Low stock threshold cannot be negative')
    }

    // Removed: Batch uniqueness check (batch_number removed)
    // Removed: Expiry check (expiry_date removed)
    // Removed: Initial/Reserved quantity checks (fields removed)

    // Validate 1:1 product constraint for create
    if (operation === 'create' && data.product) {
      const existing = await req.payload.find({
        collection: 'inventory',
        where: {
          product: { equals: data.product }
        },
        limit: 1
      })
      if (existing.docs.length > 0) {
        throw new Error(`Inventory already exists for product ${data.product}`)
      }
    }

    return data
  } catch (error) {
    req.payload.logger.error(`Inventory validation failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Validates address data integrity and default constraints
 */
export const validateAddressConstraints: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // Skip validation during seeding
  if (req.context?.skipValidation || req.context?.disableRevalidate) {
    return data
  }

  try {
    // Auto-assign customer if not admin
    if (req.user?.role !== 'admin' && !data.customer) {
      data.customer = req.user?.id
    }

    // Validate address type and default flags consistency
    if (data.addressType) {
      if (data.isDefaultShipping && data.addressType === 'billing') {
        throw new Error('Billing-only address cannot be default shipping address')
      }

      if (data.isDefaultBilling && data.addressType === 'shipping') {
        throw new Error('Shipping-only address cannot be default billing address')
      }
    }

    // Ensure only one default address per type per customer
    const customerId = data.customer ?? originalDoc?.customer
    if (!customerId) {
      // Allow creating address without customer only if it's being set in the same operation logic usually
      // But schema says customer required? Let's check schema.
      // Assuming customer is checking elsewhere or let it fail if required.
      // But here we need customer ID for default check.
      if (operation === 'create' && req.user?.role !== 'admin') {
        throw new Error('Customer is required for address')
      }
    }

    if (customerId) {
      // Check default shipping constraint
      if (data.isDefaultShipping === true) {
        const existingDefault = await req.payload.find({
          collection: 'addresses',
          where: {
            and: [
              { customer: { equals: customerId } },
              { isDefaultShipping: { equals: true } },
              ...(operation === 'update' && originalDoc ? [{ id: { not_equals: originalDoc.id } }] : []),
            ],
          },
          limit: 1,
        })

        if (existingDefault.docs.length > 0) {
          // Unset the existing default
          await req.payload.update({
            collection: 'addresses',
            id: existingDefault.docs[0].id,
            data: { isDefaultShipping: false },
            req,
            context: { skipValidation: true },
          })
        }
      }

      // Check default billing constraint
      if (data.isDefaultBilling === true) {
        const existingDefault = await req.payload.find({
          collection: 'addresses',
          where: {
            and: [
              { customer: { equals: customerId } },
              { isDefaultBilling: { equals: true } },
              ...(operation === 'update' && originalDoc ? [{ id: { not_equals: originalDoc.id } }] : []),
            ],
          },
          limit: 1,
        })

        if (existingDefault.docs.length > 0) {
          // Unset the existing default
          await req.payload.update({
            collection: 'addresses',
            id: existingDefault.docs[0].id,
            data: { isDefaultBilling: false },
            req,
            context: { skipValidation: true },
          })
        }
      }
    }

    return data
  } catch (error) {
    req.payload.logger.error(`Address validation failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Validates order data integrity and prescription requirements
 */
export const validateOrderIntegrity: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  // Skip validation during seeding or specific contexts
  if (req.context?.skipValidation || req.context?.disableRevalidate) {
    return data
  }

  try {
    // Auto-assign customer if not admin
    if (req.user?.role !== 'admin' && !data.customer) {
      data.customer = req.user?.id
    }

    // Validate prescription requirements
    if (data.items && Array.isArray(data.items)) {
      let requiresPrescription = false

      for (const item of data.items) {
        if (item.product) {
          const product = await req.payload.findByID({
            collection: 'products',
            id: typeof item.product === 'object' ? item.product.id : item.product,
            depth: 0,
          })

          if (product?.requires_prescription) {
            requiresPrescription = true
            break
          }
        }
      }

      // Set prescription_required based on items
      if (requiresPrescription && data.prescription_required !== true) {
        data.prescription_required = true
      }

      // Validate prescription verification for non-pending orders
      if (
        data.prescription_required &&
        data.status &&
        data.status !== 'pending' &&
        data.status !== 'cancelled' &&
        !data.prescription_verified
      ) {
        throw new Error('Prescription orders must be verified before processing')
      }

      // Validate verified_by when prescription_verified is true
      if (data.prescription_verified && !data.verified_by) {
        throw new Error('Prescription verification requires verified_by user')
      }
    }

    // Validate required addresses
    if (operation === 'create') {
      if (!data.shippingAddress) {
        throw new Error('Shipping address is required')
      }

      if (!data.billingAddress) {
        // Use shipping address as billing if not provided
        data.billingAddress = data.shippingAddress
      }
    }

    // Validate order status transitions
    if (operation === 'update' && originalDoc && data.status !== originalDoc.status) {
      const validTransitions: Record<string, string[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [], // Final state
        cancelled: [], // Final state
      }

      const allowedNextStates = validTransitions[originalDoc.status] || []
      if (!allowedNextStates.includes(data.status)) {
        throw new Error(
          `Invalid status transition from ${originalDoc.status} to ${data.status}`
        )
      }
    }

    return data
  } catch (error) {
    req.payload.logger.error(`Order validation failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

// Removed: validateInventoryMovementIntegrity

/**
 * Validates product data integrity
 */
export const validateProductIntegrity: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation: _operation
}) => {
  // Skip validation during seeding
  if (req.context?.skipValidation || req.context?.disableRevalidate) {
    return data
  }

  try {
    // Validate pharmacy-specific fields
    if (data.requires_prescription === true) {
      // Prescription products should have certain fields
      if (!data.generic_name) {
        throw new Error('Generic name is required for prescription products')
      }

      if (!data.manufacturer) {
        throw new Error('Manufacturer is required for prescription products')
      }

      if (!data.strength) {
        throw new Error('Strength is required for prescription products')
      }
    }

    // Validate dosage form if provided
    if (data.dosage_form) {
      const validForms = [
        'tablet', 'capsule', 'syrup', 'liquid', 'cream', 'ointment',
        'gel', 'injection', 'drops', 'spray', 'patch', 'powder',
        'suppository', 'inhaler', 'other'
      ]

      if (!validForms.includes(data.dosage_form)) {
        throw new Error(`Invalid dosage form: ${data.dosage_form}`)
      }
    }

    // Validate price
    if (data.priceInUSD !== undefined && data.priceInUSD < 0) {
      throw new Error('Price cannot be negative')
    }

    return data
  } catch (error) {
    req.payload.logger.error(`Product validation failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Logs data integrity issues after changes
 */
export const logDataIntegrityIssues: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation: _operation,
  collection,
}) => {
  // Skip during seeding
  if (req.context?.skipValidation || req.context?.disableRevalidate) {
    return doc
  }

  try {
    // Run basic integrity checks based on collection
    switch (collection.slug) {
      case 'inventory':
        const inventoryResult = await validateInventoryQuantities(req.payload, doc.id)
        if (!inventoryResult.valid) {
          req.payload.logger.warn(`Inventory integrity issues for ${doc.id}: ${inventoryResult.errors.join(', ')}`)
        }
        break

      case 'addresses':
        const addressResult = await validateAddressIntegrity(req.payload, doc.id)
        if (!addressResult.valid) {
          req.payload.logger.warn(`Address integrity issues for ${doc.id}: ${addressResult.errors.join(', ')}`)
        }
        break

      default:
        // No specific checks for other collections
        break
    }

    return doc
  } catch (error) {
    req.payload.logger.error(`Error checking data integrity for ${collection.slug}: ${error instanceof Error ? error.message : String(error)}`)
    return doc
  }
}
