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

  // Only process if we have user data and are setting as default
  if (!data || !data.user || !data.is_default) {
    return data
  }

  const userId = typeof data.user === 'object' ? data.user.id : data.user

  try {
    // Find existing default addresses for this user
    const existingDefaults = await req.payload.find({
      collection: 'addresses',
      where: {
        and: [
          { user: { equals: userId } },
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