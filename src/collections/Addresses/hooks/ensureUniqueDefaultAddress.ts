import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Ensures only one default address per type per user.
 * When setting an address as default, unsets any existing default addresses of the same type.
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

  // Only process if we have customer data and are setting defaults
  if (!data || !data.customer || (!data.isDefaultShipping && !data.isDefaultBilling)) {
    return data
  }

  const customerId = typeof data.customer === 'object' ? data.customer.id : data.customer

  try {
    // Handle default shipping address
    if (data.isDefaultShipping) {
      // Find existing default shipping addresses for this customer
      const existingDefaultShipping = await req.payload.find({
        collection: 'addresses',
        where: {
          and: [
            { customer: { equals: customerId } },
            { isDefaultShipping: { equals: true } },
            ...(operation === 'update' && originalDoc?.id 
              ? [{ id: { not_equals: originalDoc.id } }] 
              : []
            ),
          ],
        },
        req,
        overrideAccess: true, // Use admin access to ensure we can update other addresses
      })

      // Unset existing default shipping addresses
      for (const address of existingDefaultShipping.docs) {
        await req.payload.update({
          collection: 'addresses',
          id: address.id,
          data: { isDefaultShipping: false } as any,
          req,
          overrideAccess: true, // Use admin access to ensure we can update
          context: { skipDefaultAddressHook: true }, // Prevent infinite loop
        })
      }
    }

    // Handle default billing address
    if (data.isDefaultBilling) {
      // Find existing default billing addresses for this customer
      const existingDefaultBilling = await req.payload.find({
        collection: 'addresses',
        where: {
          and: [
            { customer: { equals: customerId } },
            { isDefaultBilling: { equals: true } },
            ...(operation === 'update' && originalDoc?.id 
              ? [{ id: { not_equals: originalDoc.id } }] 
              : []
            ),
          ],
        },
        req,
        overrideAccess: true, // Use admin access to ensure we can update other addresses
      })

      // Unset existing default billing addresses
      for (const address of existingDefaultBilling.docs) {
        await req.payload.update({
          collection: 'addresses',
          id: address.id,
          data: { isDefaultBilling: false } as any,
          req,
          overrideAccess: true, // Use admin access to ensure we can update
          context: { skipDefaultAddressHook: true }, // Prevent infinite loop
        })
      }
    }
  } catch (error) {
    req.payload.logger.error(`Error in ensureUniqueDefaultAddress hook: ${String(error)}`)
    // Don't throw error to prevent address creation/update failure
  }

  return data
}