import type { Access, Where } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Atomic access checker that verifies if the user owns the document being accessed.
 * Returns a Where query to filter documents by ownership fields.
 *
 * Admins have full access, authenticated users get filtered by ownership fields
 * (customer, user, or orderedBy), and unauthenticated users are denied access.
 *
 * @returns true for admins, Where query for customers, false for guests
 */
export const isDocumentOwner: Access = ({ req }) => {
  // Admin has full access
  if (req.user && checkRole(['admin'], req.user)) {
    return true
  }

  // Authenticated user - return Where query to filter by ownership fields
  if (req.user?.id) {
    const query: Where = {
      or: [
        {
          customer: {
            equals: req.user.id,
          },
        },
        {
          user: {
            equals: req.user.id,
          },
        },
        {
          orderedBy: {
            equals: req.user.id,
          },
        },
      ],
    }
    return query
  }

  // Guest - no access
  return false
}
