import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Access control for customer-owned documents.
 * Admins have full access, authenticated customers can only access their own documents.
 * 
 * This is specifically designed for collections that use 'customer' field to reference users,
 * such as addresses, orders, and carts.
 * 
 * @returns true for admins, Where query for customers filtering by customer field, false for guests
 */
export const adminOrCustomerOwner: Access = ({ req }) => {
  // Admin has full access
  if (req.user && checkRole(['admin'], req.user)) {
    return true
  }

  // Authenticated customer - return Where query to filter by customer field
  if (req.user?.id) {
    return {
      customer: {
        equals: req.user.id,
      },
    }
  }

  // Guest - no access
  return false
}