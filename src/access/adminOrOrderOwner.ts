import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Access control for Orders collection.
 * Per Payload docs: Where query must only reference fields that exist in the collection.
 * Orders uses 'orderedBy' field (maps to user_id in DB).
 */
export const adminOrOrderOwner: Access = ({ req }) => {
  if (req.user && checkRole(['admin'], req.user)) {
    return true
  }
  if (req.user?.id) {
    return { orderedBy: { equals: req.user.id } }
  }
  return false
}
