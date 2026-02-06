import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

/**
 * Validates address data integrity and business rules.
 * Matches Supabase schema: recipient_name, phone, address_line, city, postal_code
 */
export const validateAddressData: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (!data) return data

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

  // Validate postal code format for Indonesia (5 digits)
  if (data.postal_code) {
    const postalCodeRegex = /^\d{5}$/
    if (!postalCodeRegex.test(data.postal_code)) {
      throw new APIError(
        'Postal code must be 5 digits',
        400,
        null,
        true
      )
    }
  }

  // Ensure label is unique per customer (only for create operations)
  if (data.label && data.customer && operation === 'create') {
    const customerId = typeof data.customer === 'object' ? data.customer.id : data.customer

    try {
      const existingAddresses = await req.payload.find({
        collection: 'addresses',
        where: {
          and: [
            { customer: { equals: customerId } },
            { label: { equals: data.label } },
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