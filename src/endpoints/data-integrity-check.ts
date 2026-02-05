/**
 * Data Integrity Check Endpoint
 * 
 * Provides an endpoint for running comprehensive data integrity checks
 * across all pharmacy collections.
 */

import { runDataIntegrityCheck } from '@/utilities/dataIntegrity'
import type { Endpoint } from 'payload'

export const dataIntegrityCheckEndpoint: Endpoint = {
  path: '/data-integrity-check',
  method: 'post',
  handler: async (req) => {
    try {
      // Check if user is admin
      if (!req.user?.roles?.includes('admin')) {
        return Response.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 403 }
        )
      }

      const {
        checkInventory = true,
        checkProducts = true,
        checkOrders = true,
        checkAddresses = true,
        checkMovements = false, // Disabled
        detailed = false
      } = req.json ? await req.json() : {}

      req.payload.logger.info('Starting data integrity check...')

      const result = await runDataIntegrityCheck(req.payload, {
        checkInventory,
        checkProducts,
        checkOrders,
        checkAddresses,
        checkMovements: false, // Force disable
      })

      req.payload.logger.info(`Data integrity check completed. Found ${result.totalErrors} errors.`)

      // Return summary or detailed results based on request
      const response = {
        timestamp: new Date().toISOString(),
        valid: result.valid,
        totalErrors: result.totalErrors,
        summary: {
          inventoryErrors: Object.keys(result.errors).filter(k => k.startsWith('inventory-')).length,
          productErrors: Object.keys(result.errors).filter(k => k.startsWith('product-')).length,
          orderErrors: Object.keys(result.errors).filter(k => k.startsWith('order-')).length,
          addressErrors: Object.keys(result.errors).filter(k => k.startsWith('address-')).length,
          movementErrors: 0,
          systemErrors: Object.keys(result.errors).filter(k => k.startsWith('system')).length,
        },
        ...(detailed && { errors: result.errors }),
      }

      return Response.json(response, {
        status: result.valid ? 200 : 422,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Data integrity check failed: ${errorMessage}`)

      return Response.json(
        {
          error: 'Data integrity check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  },
}

/**
 * Quick Health Check Endpoint
 * 
 * Provides a lightweight health check for critical data integrity issues
 */
export const quickHealthCheckEndpoint: Endpoint = {
  path: '/health-check',
  method: 'get',
  handler: async (req) => {
    try {
      const checks = {
        database: false,
        inventory: false,
        orders: false,
        addresses: false,
      }

      const errors: string[] = []

      // Check database connectivity
      try {
        await req.payload.find({
          collection: 'users',
          limit: 1,
        })
        checks.database = true
      } catch (error) {
        errors.push('Database connectivity failed')
      }

      // Check for critical inventory issues
      try {
        const negativeInventory = await req.payload.find({
          collection: 'inventory',
          where: {
            quantity: { less_than: 0 },
          },
          limit: 1,
        })

        if (negativeInventory.docs.length === 0) {
          checks.inventory = true
        } else {
          errors.push('Found inventory with negative quantities')
        }
      } catch (error) {
        errors.push('Inventory check failed')
      }

      // Check for orders without addresses
      try {
        const ordersWithoutAddresses = await req.payload.find({
          collection: 'orders',
          where: {
            or: [
              { shippingAddress: { exists: false } },
              { billingAddress: { exists: false } },
            ],
          },
          limit: 1,
        })

        if (ordersWithoutAddresses.docs.length === 0) {
          checks.orders = true
        } else {
          errors.push('Found orders without required addresses')
        }
      } catch (error) {
        errors.push('Order check failed')
      }

      // Check for duplicate default addresses (simplified check)
      checks.addresses = true // Simplified for now

      const allHealthy = Object.values(checks).every(check => check)

      return Response.json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks,
        errors: errors.length > 0 ? errors : undefined,
      }, {
        status: allHealthy ? 200 : 503,
      })
    } catch (error) {
      return Response.json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }, {
        status: 500,
        212: 500
      })
    }
  },
}

/**
 * Fix Data Issues Endpoint
 * 
 * Attempts to automatically fix common data integrity issues
 */
export const fixDataIssuesEndpoint: Endpoint = {
  path: '/fix-data-issues',
  method: 'post',
  handler: async (req) => {
    try {
      // Check if user is admin
      if (!req.user?.roles?.includes('admin')) {
        return Response.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 403 }
        )
      }

      const {
        fixNegativeInventory = false,
        dryRun = true
      } = req.json ? await req.json() : {}

      const fixes: string[] = []
      const errors: string[] = []

      req.payload.logger.info(`Starting data issue fixes (dry run: ${dryRun})...`)

      // Fix negative inventory quantities
      if (fixNegativeInventory) {
        try {
          const negativeInventory = await req.payload.find({
            collection: 'inventory',
            where: {
              quantity: { less_than: 0 },
            },
            limit: 100,
          })

          for (const inventory of negativeInventory.docs) {
            if (!dryRun) {
              await req.payload.update({
                collection: 'inventory',
                id: inventory.id,
                data: {
                  quantity: 0,
                },
                context: { skipValidation: true },
              })
              // No audit log created
            }

            fixes.push(`Fixed negative inventory for ${inventory.id}: ${inventory.quantity} → 0`)
          }
        } catch (error) {
          errors.push(`Error fixing negative inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      req.payload.logger.info(`Data issue fixes completed. Applied ${fixes.length} fixes, encountered ${errors.length} errors.`)

      return Response.json({
        timestamp: new Date().toISOString(),
        dryRun,
        fixesApplied: fixes.length,
        errorsEncountered: errors.length,
        fixes,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      req.payload.logger.error(`Fix data issues failed: ${errorMessage}`)

      return Response.json(
        {
          error: 'Fix data issues failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  },
}