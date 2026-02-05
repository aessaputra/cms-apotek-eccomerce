import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

/**
 * Specialized access control for inventory operations
 * 
 * This access control function provides enhanced security for inventory management
 * by ensuring only active admin users can access inventory data and operations.
 * 
 * Requirements: 7.3, 7.4 - Administrative access for inventory collection
 * 
 * @returns true if user is an active admin, false otherwise
 */
export const inventoryAdminAccess: Access = ({ req }) => {
  const { user } = req

  // No user means no access
  if (!user) {
    req.payload.logger.warn('Inventory access attempted without authentication')
    return false
  }

  // Check if user account is active
  if (user.is_active === false) {
    req.payload.logger.warn(`Inventory access denied for inactive user ${user.id}`)
    return false
  }

  // Validate that user has roles array
  if (!user.roles || !Array.isArray(user.roles)) {
    req.payload.logger.warn(`User ${user.id} has invalid roles structure for inventory access: ${JSON.stringify(user.roles)}`)
    return false
  }

  // Check for admin role
  const hasAdminRole = checkRole(['admin'], user)
  
  if (!hasAdminRole) {
    req.payload.logger.info(`Inventory access denied for user ${user.id} - admin role required`)
    return false
  }

  // Log successful access for audit purposes
  req.payload.logger.info(`Inventory access granted to admin user ${user.id}`)
  
  return true
}