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
    // Check if this address is referenced by any orders (Orders collection uses 'address' field, dbName: address_id)
    const ordersWithAddress = await payload.find({
      collection: 'orders',
      where: {
        address: {
          equals: id,
        },
      },
      limit: 1,
      req,
      overrideAccess: false,
    })

    if (ordersWithAddress.totalDocs > 0) {
      throw new APIError(
        'Cannot delete address: it is referenced by existing orders. You can deactivate it instead.',
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