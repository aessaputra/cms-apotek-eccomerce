import { checkRole } from '@/access/utilities'
import type { PayloadRequest } from 'payload'

/**
 * Utility function to validate administrative operations
 * 
 * This function provides a centralized way to validate that a user
 * has the necessary permissions to perform administrative operations
 * across the pharmacy system.
 * 
 * @param req - Payload request object
 * @param operation - Description of the operation being performed
 * @returns true if user is authorized, throws error otherwise
 */
export const validateAdminOperation = (req: PayloadRequest, operation: string): boolean => {
  const { user, payload } = req

  // Check if user is authenticated
  if (!user) {
    payload.logger.warn(`Administrative operation '${operation}' attempted without authentication`)
    throw new Error('Authentication required for administrative operations')
  }

  // Validate role structure
  if (!user.role || typeof user.role !== 'string') {
    payload.logger.error(`User ${user.id} has invalid role structure: ${JSON.stringify(user.role)}`)
    throw new Error('Invalid user role configuration')
  }

  // Check for admin role
  const hasAdminRole = checkRole(['admin'], user)

  if (!hasAdminRole) {
    payload.logger.warn(`Administrative operation '${operation}' denied for user ${user.id} - admin role required`)
    throw new Error('Administrative privileges required')
  }

  // Log successful validation
  payload.logger.info(`Administrative operation '${operation}' authorized for user ${user.id}`)

  return true
}

/**
 * Utility function to validate inventory-specific operations
 * 
 * This function adds additional validation specific to inventory operations
 * such as stock adjustments and batch management.
 * 
 * @param req - Payload request object
 * @param operation - Description of the inventory operation
 * @param inventoryId - Optional inventory item ID for logging
 * @returns true if user is authorized, throws error otherwise
 */
export const validateInventoryOperation = (
  req: PayloadRequest,
  operation: string,
  inventoryId?: string
): boolean => {
  // First validate basic admin operation
  validateAdminOperation(req, operation)

  // Additional inventory-specific logging
  const logMessage = inventoryId
    ? `Inventory operation '${operation}' on item ${inventoryId} authorized for user ${req.user?.id}`
    : `Inventory operation '${operation}' authorized for user ${req.user?.id}`

  req.payload.logger.info(logMessage)

  return true
}

/**
 * Utility function to validate audit log operations
 * 
 * This function provides validation for audit log access with enhanced
 * security logging for compliance purposes.
 * 
 * @param req - Payload request object
 * @param operation - Description of the audit operation
 * @param movementId - Optional movement ID for logging
 * @returns true if user is authorized, throws error otherwise
 */
export const validateAuditOperation = (
  req: PayloadRequest,
  operation: string,
  movementId?: string
): boolean => {
  // First validate basic admin operation
  validateAdminOperation(req, operation)

  // Enhanced logging for audit operations (for security compliance)
  const logMessage = movementId
    ? `Audit operation '${operation}' on movement ${movementId} by user ${req.user?.id}`
    : `Audit operation '${operation}' by user ${req.user?.id}`

  req.payload.logger.info(logMessage)

  return true
}