import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Ensures only one default address per user.
 * When setting an address as default, unsets any existing default addresses.
 */
export const ensureUniqueDefaultAddress: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
  context,
}) => {
  // Skip hook if context flag is set (prevents infinite loops)
  if (context?.skipDefaultAddressHook) {
    return data
  }

  // Only process if we have customer data and are setting as default
  if (!data || !data.customer || !data.is_default) {
    return data
  }

  const customerId = typeof data.customer === 'object' ? data.customer.id : data.customer

  try {
    // Find existing default addresses for this customer
    const existingDefaults = await req.payload.find({
      collection: 'addresses',
      where: {
        and: [
          { customer: { equals: customerId } },
          { is_default: { equals: true } },
          ...(operation === 'update' && originalDoc?.id
            ? [{ id: { not_equals: originalDoc.id } }]
            : []
          ),
        ],
      },
      req,
      overrideAccess: true,
    })

    // Unset existing default addresses
    for (const address of existingDefaults.docs) {
      await req.payload.update({
        collection: 'addresses',
        id: address.id,
        data: { is_default: false },
        req,
        overrideAccess: true,
        context: { skipDefaultAddressHook: true }, // Prevent infinite loop
      })
    }
  } catch (error) {
    req.payload.logger.error(`Error in ensureUniqueDefaultAddress hook: ${String(error)}`)
    // Don't throw error to prevent address creation/update failure
  }

  return data
}