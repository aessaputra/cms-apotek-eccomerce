import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

/**
 * Integration tests for administrative access policies
 * 
 * Requirements tested:
 * - 7.3: Admin-only access for inventory collection
 * - 7.4: Admin access for inventory_movements collection
 * - 6.3: Administrative authorization for inventory adjustments
 * 
 * These tests verify that sensitive administrative operations are properly
 * restricted to users with admin roles and that audit logs are immutable.
 */

describe('Administrative Access Policies', () => {
  let payload: Payload
  let adminUser: any
  let customerUser: any
  let inactiveAdminUser: any
  let testProduct: any
  let testInventory: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    // Create admin user
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'admin-policy-test@example.com',
        password: 'test123456',
        name: 'Admin User',
        phone: '+1234567890',
        roles: ['admin'],
        is_active: true,
      },
    })

    // Create customer user
    customerUser = await payload.create({
      collection: 'users',
      data: {
        email: 'customer-policy-test@example.com',
        password: 'test123456',
        name: 'Customer User',
        phone: '+1234567891',
        roles: ['customer'],
        is_active: true,
      },
    })

    // Create inactive admin user
    inactiveAdminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'inactive-admin-test@example.com',
        password: 'test123456',
        name: 'Inactive Admin',
        phone: '+1234567892',
        roles: ['admin'],
        is_active: false,
      },
    })

    // Create test product
    testProduct = await payload.create({
      collection: 'products',
      data: {
        title: 'Test Product for Admin Access',
        slug: 'test-product-admin-access',
        _status: 'published',
        stripeProductID: 'test-stripe-product-admin',
      },
    })
  })

  afterAll(async () => {
    // Clean up test data
    if (testInventory?.id) {
      await payload.delete({ collection: 'inventory', id: testInventory.id })
    }
    if (testProduct?.id) {
      await payload.delete({ collection: 'products', id: testProduct.id })
    }
    if (adminUser?.id) {
      await payload.delete({ collection: 'users', id: adminUser.id })
    }
    if (customerUser?.id) {
      await payload.delete({ collection: 'users', id: customerUser.id })
    }
    if (inactiveAdminUser?.id) {
      await payload.delete({ collection: 'users', id: inactiveAdminUser.id })
    }
  })

  describe('Inventory Collection Access (Requirements 7.3, 7.4)', () => {
    it('should allow active admin users to create inventory', async () => {
      testInventory = await payload.create({
        collection: 'inventory',
        data: {
          product: testProduct.id,
          batch_number: 'ADMIN-TEST-001',
          expiry_date: '2025-12-31',
          initial_quantity: 100,
          current_quantity: 100,
          minimum_stock_level: 10,
        },
        user: adminUser,
        overrideAccess: false,
      })

      expect(testInventory).toBeDefined()
      expect(testInventory.batch_number).toBe('ADMIN-TEST-001')
    })

    it('should allow active admin users to read inventory', async () => {
      const result = await payload.find({
        collection: 'inventory',
        user: adminUser,
        overrideAccess: false,
      })

      expect(result.docs.length).toBeGreaterThanOrEqual(1)
      const inventoryIds = result.docs.map((doc: any) => doc.id)
      expect(inventoryIds).toContain(testInventory.id)
    })

    it('should allow active admin users to update inventory', async () => {
      const updated = await payload.update({
        collection: 'inventory',
        id: testInventory.id,
        data: {
          current_quantity: 95,
        },
        user: adminUser,
        overrideAccess: false,
      })

      expect(updated.current_quantity).toBe(95)
    })

    it('should prevent customer users from accessing inventory', async () => {
      await expect(
        payload.find({
          collection: 'inventory',
          user: customerUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent customer users from creating inventory', async () => {
      await expect(
        payload.create({
          collection: 'inventory',
          data: {
            product: testProduct.id,
            batch_number: 'CUSTOMER-HACK-001',
            expiry_date: '2025-12-31',
            initial_quantity: 50,
            current_quantity: 50,
          },
          user: customerUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent inactive admin users from accessing inventory', async () => {
      await expect(
        payload.find({
          collection: 'inventory',
          user: inactiveAdminUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent unauthenticated access to inventory', async () => {
      await expect(
        payload.find({
          collection: 'inventory',
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })
  })

  describe('Inventory Movements (Audit Log) Access (Requirements 6.3, 7.4)', () => {
    let testMovement: any

    beforeAll(async () => {
      // Create a test inventory movement (this would normally be done via hooks)
      testMovement = await payload.create({
        collection: 'inventory-movements',
        data: {
          inventory: testInventory.id,
          movement_type: 'adjustment',
          quantity_change: -5,
          quantity_before: 100,
          quantity_after: 95,
          performed_by: adminUser.id,
          reason: 'Test administrative adjustment',
        },
        user: adminUser,
        overrideAccess: false,
      })
    })

    afterAll(async () => {
      if (testMovement?.id) {
        // Note: In production, audit logs cannot be deleted
        // This is only for test cleanup
        await payload.delete({ 
          collection: 'inventory-movements', 
          id: testMovement.id,
          overrideAccess: true, // Override for test cleanup only
        })
      }
    })

    it('should allow active admin users to read inventory movements', async () => {
      const result = await payload.find({
        collection: 'inventory-movements',
        user: adminUser,
        overrideAccess: false,
      })

      expect(result.docs.length).toBeGreaterThanOrEqual(1)
      const movementIds = result.docs.map((doc: any) => doc.id)
      expect(movementIds).toContain(testMovement.id)
    })

    it('should prevent customer users from reading inventory movements', async () => {
      await expect(
        payload.find({
          collection: 'inventory-movements',
          user: customerUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent inactive admin users from reading inventory movements', async () => {
      await expect(
        payload.find({
          collection: 'inventory-movements',
          user: inactiveAdminUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent unauthenticated access to inventory movements', async () => {
      await expect(
        payload.find({
          collection: 'inventory-movements',
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent updates to inventory movements (immutable audit logs)', async () => {
      await expect(
        payload.update({
          collection: 'inventory-movements',
          id: testMovement.id,
          data: {
            reason: 'Hacked reason',
          },
          user: adminUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should prevent deletion of inventory movements (permanent audit logs)', async () => {
      await expect(
        payload.delete({
          collection: 'inventory-movements',
          id: testMovement.id,
          user: adminUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })
  })

  describe('Role Validation (Requirement 6.3)', () => {
    let userWithoutRoles: any
    let userWithInvalidRoles: any

    beforeAll(async () => {
      // Create user without roles (this should not happen in normal operation)
      userWithoutRoles = await payload.create({
        collection: 'users',
        data: {
          email: 'no-roles-test@example.com',
          password: 'test123456',
          name: 'No Roles User',
          phone: '+1234567893',
          // No roles field
        },
        overrideAccess: true, // Override to create invalid user for testing
      })

      // Manually set invalid roles structure for testing
      await payload.update({
        collection: 'users',
        id: userWithoutRoles.id,
        data: {
          roles: null, // Invalid roles structure
        },
        overrideAccess: true,
      })
    })

    afterAll(async () => {
      if (userWithoutRoles?.id) {
        await payload.delete({ collection: 'users', id: userWithoutRoles.id })
      }
    })

    it('should prevent access for users with invalid roles structure', async () => {
      // Fetch the user with invalid roles
      const invalidUser = await payload.findByID({
        collection: 'users',
        id: userWithoutRoles.id,
        overrideAccess: true,
      })

      await expect(
        payload.find({
          collection: 'inventory',
          user: invalidUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })
  })
})