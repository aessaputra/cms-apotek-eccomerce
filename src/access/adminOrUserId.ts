import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control for documents owned by a user via 'user' field.
 * Admins have full access, authenticated users can access their own documents.
 *
 * Per Payload docs: Where query must only reference fields that exist in the collection.
 * Collections like cart_items use field 'user' (dbName: user_id).
 *
 * @returns true for admins, Where query for users filtering by owner field, false for guests
 */
export const adminOrUserId: Access = ({ req: { user } }) => {
  if (user) {
    if (checkRole(['admin'], user)) {
      return true
    }
    return { user: { equals: user.id } }
  }
  return false
}
