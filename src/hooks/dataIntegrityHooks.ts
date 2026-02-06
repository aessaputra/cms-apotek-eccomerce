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
    // Auto-assign user if not admin
    if (req.user?.role !== 'admin' && !data.user) {
      data.user = req.user?.id
    }

    // Ensure only one default address per customer
    const userId = data.user ?? originalDoc?.user
    if (!userId) {
      if (operation === 'create' && req.user?.role !== 'admin') {
        throw new Error('User is required for address')
      }
    }

    if (userId) {
      // Check default constraint
      if (data.is_default === true) {
        const existingDefault = await req.payload.find({
          collection: 'addresses',
          where: {
            and: [
              { user: { equals: userId } },
              { is_default: { equals: true } },
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
            data: { is_default: false },
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
 * Validates order data integrity
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
    // Auto-assign user if not admin
    if (req.user?.role !== 'admin' && !data.orderedBy) {
      data.orderedBy = req.user?.id
    }

    // Validate required addresses
    if (operation === 'create') {
      if (!data.shipping_address) {
        throw new Error('Shipping address is required')
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
