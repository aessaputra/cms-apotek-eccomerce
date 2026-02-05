import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Enhanced admin-only access control with explicit role validation
 * 
 * This access control function ensures that only users with the 'admin' role
 * can perform operations on sensitive collections like inventory and audit logs.
 * 
 * Requirements: 7.3, 7.4, 6.3 - Administrative access for inventory and audit operations
 * 
 * @returns true if user has admin role, false otherwise
 */
export const adminOnlyWithRoleValidation: Access = ({ req }) => {
  const { user } = req

  // No user means no access
  if (!user) {
    return false
  }

  // Validate that user has roles array
  if (!user.roles || !Array.isArray(user.roles)) {
    req.payload.logger.warn(`User ${user.id} has invalid roles structure: ${JSON.stringify(user.roles)}`)
    return false
  }

  // Check for admin role using the utility function
  const hasAdminRole = checkRole(['admin'], user)
  
  if (!hasAdminRole) {
    req.payload.logger.info(`Access denied for user ${user.id} - admin role required`)
  }

  return hasAdminRole
}