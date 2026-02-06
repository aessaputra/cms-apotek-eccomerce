import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Enhanced admin-only access control with explicit role validation
 * 
 * This access control function ensures that only users with the 'admin' role
 * can perform operations on sensitive collections like inventory and audit logs.
 * 
 * @returns true if user has admin role, false otherwise
 */
export const adminOnlyWithRoleValidation: Access = ({ req }) => {
  const { user } = req

  // No user means no access
  if (!user) {
    return false
  }

  // Validate that user has role string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as any).role || typeof (user as any).role !== 'string') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.payload.logger.warn(`User ${user.id} has invalid role structure: ${JSON.stringify((user as any).role)}`)
    return false
  }

  // Check for admin role using the utility function
  const hasAdminRole = checkRole(['admin'], user)

  if (!hasAdminRole) {
    req.payload.logger.info(`Access denied for user ${user.id} - admin role required`)
  }

  return hasAdminRole
}