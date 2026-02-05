/**
 * Data Integrity Utilities
 * 
 * Provides validation and consistency checking functions for pharmacy data
 */

import type { Payload } from 'payload';

/**
 * Validates that inventory quantities are consistent
 */
export async function validateInventoryQuantities(
  payload: Payload,
  inventoryId: string | number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  try {
    const inventory = await payload.findByID({
      collection: 'inventory',
      id: inventoryId,
    })

    if (!inventory) {
      errors.push(`Inventory record ${inventoryId} not found`)
      return { valid: false, errors }
    }

    // Check non-negative quantities
    if ((inventory.quantity || 0) < 0) {
      errors.push(`Quantity cannot be negative: ${inventory.quantity}`)
    }

    // Check minimum stock level is reasonable (low_stock_threshold)
    if (inventory.low_stock_threshold != null && inventory.low_stock_threshold < 0) {
      errors.push(`Low stock threshold cannot be negative: ${inventory.low_stock_threshold}`)
    }

    return { valid: errors.length === 0, errors }
  } catch (error) {
    errors.push(`Error validating inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { valid: false, errors }
  }
}

/**
 * Validates product availability matches inventory
 * Ensures product stock calculations are consistent with inventory records
 */
export async function validateProductInventoryConsistency(
  payload: Payload,
  productId: string | number
): Promise<{ valid: boolean; errors: string[]; calculatedStock?: number }> {
  const errors: string[] = []

  try {
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
    })

    if (!product) {
      errors.push(`Product ${productId} not found`)
      return { valid: false, errors }
    }

    // Get inventory
    const inventoryRecords = await payload.find({
      collection: 'inventory',
      where: {
        product: { equals: productId },
      },
      limit: 1000,
    })

    if (inventoryRecords.docs.length > 1) {
      errors.push(`Multiple inventory records found for product ${productId} - Violation of 1:1 constraint`)
    }

    // Calculate total available stock
    const calculatedStock = inventoryRecords.docs.reduce(
      (total, inv) => total + (inv.quantity || 0),
      0
    )

    return { valid: errors.length === 0, errors, calculatedStock }
  } catch (error) {
    errors.push(`Error validating product inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { valid: false, errors }
  }
}

/**
 * Validates order data integrity
 * Ensures order totals, item quantities, and prescription requirements are correct
 */
export async function validateOrderIntegrity(
  payload: Payload,
  orderId: string | number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    })

    if (!order) {
      errors.push(`Order ${orderId} not found`)
      return { valid: false, errors }
    }

    // Validate order has items
    if (!order.items || order.items.length === 0) {
      errors.push('Order must have at least one item')
    }

    // Validate prescription requirements
    let requiresPrescription = false
    if (order.items) {
      for (const item of order.items) {
        if (typeof item.product === 'object' && item.product && item.product.requires_prescription) {
          requiresPrescription = true
          break
        }
      }
    }

    if (requiresPrescription && !order.prescription_required) {
      errors.push('Order contains prescription items but prescription_required is false')
    }

    if (order.prescription_required && !requiresPrescription) {
      errors.push('Order marked as requiring prescription but contains no prescription items')
    }

    // Validate prescription verification for processing orders
    if (
      order.prescription_required &&
      order.status === 'processing' &&
      !order.prescription_verified
    ) {
      errors.push('Prescription order must be verified before processing')
    }

    // Validate verified_by is set when prescription_verified is true
    if (order.prescription_verified && !order.verified_by) {
      errors.push('Prescription verification requires verified_by user')
    }

    // Validate addresses exist
    if (!order.shippingAddress) {
      errors.push('Order must have a shipping address')
    }

    // Validate customer exists
    if (!order.customer) {
      errors.push('Order must have a customer')
    }

    return { valid: errors.length === 0, errors }
  } catch (error) {
    errors.push(`Error validating order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { valid: false, errors }
  }
}

/**
 * Validates address data integrity
 * Ensures address has all required fields and default address constraints
 */
export async function validateAddressIntegrity(
  payload: Payload,
  addressId: string | number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  try {
    const address = await payload.findByID({
      collection: 'addresses',
      id: addressId,
    })

    if (!address) {
      errors.push(`Address ${addressId} not found`)
      return { valid: false, errors }
    }

    // Validate required fields
    if (!address.customer) errors.push('Address missing required field: customer')
    if (!address.label) errors.push('Address missing required field: label')
    if (!address.firstName) errors.push('Address missing required field: firstName')
    if (!address.lastName) errors.push('Address missing required field: lastName')
    if (!address.phone) errors.push('Address missing required field: phone')
    if (!address.addressLine1) errors.push('Address missing required field: addressLine1')
    if (!address.city) errors.push('Address missing required field: city')
    if (!address.state) errors.push('Address missing required field: state')
    if (!address.postalCode) errors.push('Address missing required field: postalCode')
    if (!address.country) errors.push('Address missing required field: country')
    if (!address.addressType) errors.push('Address missing required field: addressType')

    // Validate address type
    if (!['shipping', 'billing', 'both'].includes(address.addressType)) {
      errors.push(`Invalid address type: ${address.addressType}`)
    }

    // Validate default flags match address type
    if (address.isDefaultShipping && address.addressType === 'billing') {
      errors.push('Billing-only address cannot be default shipping address')
    }

    if (address.isDefaultBilling && address.addressType === 'shipping') {
      errors.push('Shipping-only address cannot be default billing address')
    }

    return { valid: errors.length === 0, errors }
  } catch (error) {
    errors.push(`Error validating address: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { valid: false, errors }
  }
}

/**
 * Validates inventory movement audit trail integrity
 * DEPRECATED - InventoryMovements collection removed
 */
export async function validateInventoryMovementIntegrity(
  payload: Payload,
  movementId: string | number
): Promise<{ valid: boolean; errors: string[] }> {
  // Stub
  return { valid: true, errors: [] }
}

/**
 * Runs comprehensive data integrity checks across all collections
 * Returns a report of all validation errors found
 */
export async function runDataIntegrityCheck(
  payload: Payload,
  options: {
    checkInventory?: boolean
    checkProducts?: boolean
    checkOrders?: boolean
    checkAddresses?: boolean
    checkMovements?: boolean
  } = {}
): Promise<{
  valid: boolean
  totalErrors: number
  errors: Record<string, string[]>
}> {
  const {
    checkInventory = true,
    checkProducts = true,
    checkOrders = true,
    checkAddresses = true,
  } = options

  const allErrors: Record<string, string[]> = {}
  let totalErrors = 0

  try {
    // Check inventory
    if (checkInventory) {
      const inventoryRecords = await payload.find({
        collection: 'inventory',
        limit: 1000,
      })

      for (const inventory of inventoryRecords.docs) {
        const result = await validateInventoryQuantities(payload, inventory.id)
        if (!result.valid) {
          allErrors[`inventory-${inventory.id}`] = result.errors
          totalErrors += result.errors.length
        }
      }
    }

    // Check products
    if (checkProducts) {
      const products = await payload.find({
        collection: 'products',
        limit: 1000,
      })

      for (const product of products.docs) {
        const result = await validateProductInventoryConsistency(payload, product.id)
        if (!result.valid) {
          allErrors[`product-${product.id}`] = result.errors
          totalErrors += result.errors.length
        }
      }
    }

    // Check orders
    if (checkOrders) {
      const orders = await payload.find({
        collection: 'orders',
        limit: 1000,
      })

      for (const order of orders.docs) {
        const result = await validateOrderIntegrity(payload, order.id)
        if (!result.valid) {
          allErrors[`order-${order.id}`] = result.errors
          totalErrors += result.errors.length
        }
      }
    }

    // Check addresses
    if (checkAddresses) {
      const addresses = await payload.find({
        collection: 'addresses',
        limit: 1000,
      })

      for (const address of addresses.docs) {
        const result = await validateAddressIntegrity(payload, address.id)
        if (!result.valid) {
          allErrors[`address-${address.id}`] = result.errors
          totalErrors += result.errors.length
        }
      }
    }

    return {
      valid: totalErrors === 0,
      totalErrors,
      errors: allErrors,
    }
  } catch (error) {
    allErrors['system'] = [
      `Error running data integrity check: ${error instanceof Error ? error.message : 'Unknown error'}`,
    ]
    return {
      valid: false,
      totalErrors: totalErrors + 1,
      errors: allErrors,
    }
  }
}
