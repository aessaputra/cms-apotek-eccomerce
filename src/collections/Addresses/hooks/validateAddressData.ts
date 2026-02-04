import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

/**
 * Validates address data integrity and business rules.
 */
export const validateAddressData: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (!data) return data

  // Validate address type consistency
  if (data.addressType) {
    // If address type is 'shipping', ensure billing-specific fields are not set as default
    if (data.addressType === 'shipping' && data.isDefaultBilling) {
      throw new APIError(
        'Cannot set shipping-only address as default billing address',
        400,
        null,
        true
      )
    }

    // If address type is 'billing', ensure shipping-specific fields are not set as default
    if (data.addressType === 'billing' && data.isDefaultShipping) {
      throw new APIError(
        'Cannot set billing-only address as default shipping address',
        400,
        null,
        true
      )
    }

    // Clear inappropriate default flags based on address type
    if (data.addressType === 'shipping') {
      data.isDefaultBilling = false
    }
    
    if (data.addressType === 'billing') {
      data.isDefaultShipping = false
      // Clear delivery instructions for billing-only addresses
      data.deliveryInstructions = null
    }
  }

  // Validate phone number format (basic validation)
  if (data.phone) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      throw new APIError(
        'Please enter a valid phone number',
        400,
        null,
        true
      )
    }
  }

  // Validate postal code format for Indonesia (basic validation)
  if (data.postalCode && data.country === 'ID') {
    const indonesianPostalCodeRegex = /^\d{5}$/
    if (!indonesianPostalCodeRegex.test(data.postalCode)) {
      throw new APIError(
        'Indonesian postal codes must be 5 digits',
        400,
        null,
        true
      )
    }
  }

  // Ensure label is unique per customer (only for create operations to avoid complexity)
  if (data.label && data.customer && operation === 'create') {
    const customerId = typeof data.customer === 'object' ? data.customer.id : data.customer
    
    try {
      const existingAddresses = await req.payload.find({
        collection: 'addresses',
        where: {
          and: [
            { customer: { equals: customerId } },
            { label: { equals: data.label } },
            { isActive: { equals: true } },
          ],
        },
        req,
        overrideAccess: false,
      })

      if (existingAddresses.totalDocs > 0) {
        throw new APIError(
          `An address with the label "${data.label}" already exists. Please choose a different label.`,
          400,
          null,
          true
        )
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      req.payload.logger.error(`Error validating address label uniqueness: ${String(error)}`)
    }
  }

  return data
}