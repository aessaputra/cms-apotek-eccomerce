import { adminOrAddressOwner } from '@/access/adminOrAddressOwner'
import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Access control for Addresses collection - Best practice: customer-owned data.
 * Admin: read-only (view for support/order management).
 * Customer: full CRUD on own addresses (managed via React Native frontend).
 *
 * Per Payload docs: Where query must only reference fields that exist in the collection.
 * Addresses uses 'user' field (maps to user_id in DB).
 */
export const addressAdminReadOnlyAccess = {
  /** Admin cannot create; customers manage addresses via React Native. */
  create: (({ req }) => {
    if (req?.user && checkRole(['admin'], req.user)) return false
    return Boolean(req?.user?.id)
  }) as Access,

  /** Admin reads all; customer reads own. */
  read: adminOrAddressOwner,

  /** Admin cannot update; customer can update own addresses only. */
  update: (({ req }) => {
    if (req?.user && checkRole(['admin'], req.user)) return false
    if (req?.user?.id) return { user: { equals: req.user.id } }
    return false
  }) as Access,

  /** Admin cannot delete; customer can delete own addresses only. */
  delete: (({ req }) => {
    if (req?.user && checkRole(['admin'], req.user)) return false
    if (req?.user?.id) return { user: { equals: req.user.id } }
    return false
  }) as Access,
}
