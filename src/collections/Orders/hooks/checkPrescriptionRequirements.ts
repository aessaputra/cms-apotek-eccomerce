import type { Order } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Hook to check if order contains prescription items and set prescription_required flag
 * Also validates prescription verification workflow
 */
export const checkPrescriptionRequirements: CollectionBeforeChangeHook<Order> = async ({
  data,
  req,
  operation,
  originalDoc,
  context,
}) => {
  const { payload, user } = req

  try {
    // Skip if no items in the order
    if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
      return data
    }

    let requiresPrescription = false
    const prescriptionProducts: string[] = []

    // Check each item in the order to see if any require prescription
    for (const item of data.items) {
      if (item && typeof item === 'object' && 'product' in item) {
        const productId = typeof item.product === 'object' && item.product !== null 
          ? (typeof item.product.id === 'string' ? item.product.id : String(item.product.id))
          : String(item.product)

        if (productId) {
          // Fetch product details to check if it requires prescription
          const product = await payload.findByID({
            collection: 'products',
            id: productId,
            req,
            overrideAccess: false, // Respect access control
          })

          if (product?.requires_prescription) {
            requiresPrescription = true
            prescriptionProducts.push(product.title || productId)
          }
        }
      }
    }

    // Set prescription_required flag
    data.prescription_required = requiresPrescription

    // Store prescription products in context for potential use in other hooks
    context.prescriptionProducts = prescriptionProducts

    // If prescription is required, validate the verification workflow
    if (requiresPrescription) {
      // For new orders, prescription_verified should be false initially
      if (operation === 'create') {
        data.prescription_verified = false
        data.verified_by = undefined
      }

      // For updates, validate prescription verification logic
      if (operation === 'update') {
        const wasVerified = originalDoc?.prescription_verified || false
        const isNowVerified = data.prescription_verified || false

        // If prescription is being verified for the first time
        if (!wasVerified && isNowVerified) {
          // Only admins can verify prescriptions
          if (!user?.roles?.includes('admin')) {
            throw new Error('Only administrators can verify prescriptions')
          }

          // Set the verified_by field to current admin user
          data.verified_by = user.id
        }

        // If prescription verification is being removed
        if (wasVerified && !isNowVerified) {
          // Only admins can remove verification
          if (!user?.roles?.includes('admin')) {
            throw new Error('Only administrators can modify prescription verification')
          }

          // Clear the verified_by field
          data.verified_by = undefined
        }
      }

      // Validate order status based on prescription verification
      if (data.status && ['processing', 'shipped', 'delivered'].includes(data.status)) {
        if (!data.prescription_verified) {
          throw new Error(
            `Cannot set order status to "${data.status}" - prescription verification is required for orders containing prescription items: ${prescriptionProducts.join(', ')}`
          )
        }
      }
    } else {
      // If no prescription required, clear prescription-related fields
      data.prescription_verified = false
      data.verified_by = undefined
      if (!data.prescription_notes) {
        data.prescription_notes = undefined
      }
    }

    return data
  } catch (error) {
    // Re-throw the error to prevent the operation from completing
    throw error
  }
}