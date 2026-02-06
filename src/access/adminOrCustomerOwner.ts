import { checkRole } from '@/access/utilities'
import type { Access, Where } from 'payload'

/**
 * Access control for customer-owned documents.
 * Admins have full access, authenticated customers can only access their own documents.
 * 
 * This is designed for collections that use any of 'customer', 'user', or 'orderedBy' 
 * fields to reference users, such as addresses, orders, and carts.
 * 
 * @returns true for admins, Where query for customers filtering by ownership fields, false for guests
 */
export const adminOrCustomerOwner: Access = ({ req }) => {
  // Admin has full access
  if (req.user && checkRole(['admin'], req.user)) {
    return true
  }

  // Authenticated customer - return Where query to filter by owner fields
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