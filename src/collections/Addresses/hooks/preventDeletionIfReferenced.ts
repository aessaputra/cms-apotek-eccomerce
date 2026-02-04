import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

/**
 * Prevents deletion of addresses that are referenced by existing orders.
 * This maintains referential integrity for order history.
 */
export const preventDeletionIfReferenced: CollectionBeforeDeleteHook = async ({
  req,
  id,
}) => {
  const { payload } = req

  try {
    // Check if this address is referenced by any orders as billing address
    const ordersWithBillingAddress = await payload.find({
      collection: 'orders',
      where: {
        billingAddress: {
          equals: id,
        },
      },
      limit: 1,
      req,
      overrideAccess: false,
    })

    if (ordersWithBillingAddress.totalDocs > 0) {
      throw new APIError(
        'Cannot delete address: it is referenced by existing orders as a billing address. You can deactivate it instead.',
        400,
        null,
        true
      )
    }

    // Check if this address is referenced by any orders as shipping address
    const ordersWithShippingAddress = await payload.find({
      collection: 'orders',
      where: {
        shippingAddress: {
          equals: id,
        },
      },
      limit: 1,
      req,
      overrideAccess: false,
    })

    if (ordersWithShippingAddress.totalDocs > 0) {
      throw new APIError(
        'Cannot delete address: it is referenced by existing orders as a shipping address. You can deactivate it instead.',
        400,
        null,
        true
      )
    }

    // Check if this address is referenced by any transactions
    const transactionsWithBillingAddress = await payload.find({
      collection: 'transactions',
      where: {
        'billingAddress.id': {
          equals: id,
        },
      },
      limit: 1,
      req,
      overrideAccess: false,
    })

    if (transactionsWithBillingAddress.totalDocs > 0) {
      throw new APIError(
        'Cannot delete address: it is referenced by existing transactions. You can deactivate it instead.',
        400,
        null,
        true
      )
    }

    const transactionsWithShippingAddress = await payload.find({
      collection: 'transactions',
      where: {
        'shippingAddress.id': {
          equals: id,
        },
      },
      limit: 1,
      req,
      overrideAccess: false,
    })

    if (transactionsWithShippingAddress.totalDocs > 0) {
      throw new APIError(
        'Cannot delete address: it is referenced by existing transactions. You can deactivate it instead.',
        400,
        null,
        true
      )
    }

  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    
    req.payload.logger.error(`Error in preventDeletionIfReferenced hook: ${String(error)}`)
    throw new APIError(
      'Unable to verify address references. Please try again.',
      500,
      null,
      true
    )
  }
}