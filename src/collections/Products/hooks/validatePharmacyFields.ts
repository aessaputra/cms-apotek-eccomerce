import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Validate pharmacy-specific fields for products
 * Ensures data integrity and business rule compliance
 */
export const validatePharmacyFields: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  // Validate strength format if provided
  if (data.strength) {
    const strengthPattern = /^[\d.,]+\s*(mg|g|ml|l|%|units?|iu|mcg|μg)$/i
    if (!strengthPattern.test(data.strength.trim())) {
      req.payload.logger.warn(
        `Product strength "${data.strength}" may not follow standard format (e.g., "500mg", "10ml", "2.5%")`
      )
    }
  }

  // Validate generic name format if provided
  if (data.generic_name) {
    // Remove extra whitespace and ensure proper capitalization
    data.generic_name = data.generic_name
      .trim()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Validate manufacturer name if provided
  if (data.manufacturer) {
    data.manufacturer = data.manufacturer.trim()
  }

  // Business rule: If requires_prescription is true, log for audit
  if (data.requires_prescription && operation === 'create') {
    req.payload.logger.info(
      `Creating prescription product: ${data.title} (Generic: ${data.generic_name || 'N/A'})`
    )
  }

  // Ensure dosage_form is provided for pharmaceutical products
  if (data.generic_name && !data.dosage_form) {
    req.payload.logger.warn(
      `Product "${data.title}" has generic name but no dosage form specified`
    )
  }

  return data
}