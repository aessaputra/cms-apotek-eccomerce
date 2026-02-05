import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Specialized access control for audit log operations
 * 
 * This access control function provides enhanced security for inventory movement
 * audit logs by ensuring only active admin users can view audit trails.
 * 
 * Audit logs are immutable and can only be created (via hooks) and read.
 * Updates and deletes are prevented at the collection level.
 * 
 * Requirements: 6.3, 7.3, 7.4 - Administrative authorization for audit operations
 * 
 * @returns true if user is an active admin, false otherwise
 */
export const auditLogAccess: Access = ({ req }) => {
  const { user } = req

  // No user means no access to audit logs
  if (!user) {
    req.payload.logger.warn('Audit log access attempted without authentication')
    return false
  }

  // Check if user account is active
  if (user.is_active === false) {
    req.payload.logger.warn(`Audit log access denied for inactive user ${user.id}`)
    return false
  }

  // Validate that user has roles array
  if (!user.roles || !Array.isArray(user.roles)) {
    req.payload.logger.warn(`User ${user.id} has invalid roles structure for audit log access: ${JSON.stringify(user.roles)}`)
    return false
  }

  // Check for admin role
  const hasAdminRole = checkRole(['admin'], user)
  
  if (!hasAdminRole) {
    req.payload.logger.info(`Audit log access denied for user ${user.id} - admin role required`)
    return false
  }

  // Log audit log access for security monitoring
  req.payload.logger.info(`Audit log access granted to admin user ${user.id}`)
  
  return true
}

/**
 * Prevent any modifications to audit logs
 * Audit logs are immutable once created
 * 
 * Requirements: 6.4 - Audit log immutability
 */
export const preventAuditLogModification: Access = () => {
  return false
}