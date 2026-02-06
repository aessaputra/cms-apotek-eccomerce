import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Access control for Addresses collection.
 * Per Payload docs: Where query must only reference fields that exist in the collection.
 * Addresses uses 'user' field (maps to user_id in DB).
 */
export const adminOrAddressOwner: Access = ({ req }) => {
  if (req.user && checkRole(['admin'], req.user)) {
    return true
  }
  if (req.user?.id) {
    return { user: { equals: req.user.id } }
  }
  return false
}
