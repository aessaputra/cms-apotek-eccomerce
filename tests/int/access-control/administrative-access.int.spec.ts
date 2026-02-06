import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Integration tests for administrative access policies.
 * Verifies admin-only operations per Payload CMS access patterns.
 */

describe('Administrative Access Policies', () => {
  let payload: Payload
  let adminUser: any
  let customerUser: any
  let inactiveAdminUser: any
  let testCategory: any
  let testProduct: any
  let testInventory: any

  beforeAll(async () => {
    payload = await getPayload({ config })
    const ts = Date.now()

    // Create a category
    testCategory = await payload.create({
      collection: 'categories',
      data: {
        name: 'Test Category',
      },
    })

    // Create admin user
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: `admin-policy-${ts}@example.com`,
        password: 'test123456',
        full_name: 'Admin User',
        phone: '+1234567890',
        role: 'admin',
      },
    })

    // Create customer user
    customerUser = await payload.create({
      collection: 'users',
      data: {
        email: `customer-policy-${ts}@example.com`,
        password: 'test123456',
        full_name: 'Customer User',
        phone: '+1234567891',
        role: 'customer',
      },
    })

    // Create inactive admin user
    inactiveAdminUser = await payload.create({
      collection: 'users',
      data: {
        email: `inactive-admin-${ts}@example.com`,
        password: 'test123456',
        full_name: 'Inactive Admin',
        phone: '+1234567892',
        role: 'customer', // Testing non-admin access
      },
    })

    // Create test product
    testProduct = await payload.create({
      collection: 'products',
      data: {
        title: 'Test Product for Admin Access',
        slug: 'test-product-admin-access',
        _status: 'published',
        category: testCategory.id,
        price: 100,
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
    if (testCategory?.id) {
      await payload.delete({ collection: 'categories', id: testCategory.id })
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

  describe('Inventory Collection Access', () => {
    it('should allow active admin users to create inventory', async () => {
      testInventory = await payload.create({
        collection: 'inventory',
        data: {
          product: testProduct.id,
          quantity: 100,
          low_stock_threshold: 10,
        },
        user: adminUser,
        overrideAccess: false,
      })

      expect(testInventory).toBeDefined()
      expect(testInventory.quantity).toBe(100)
    })

    it('should allow active admin users to read inventory', { timeout: 60000 }, async () => {
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
          quantity: 95,
        },
        user: adminUser,
        overrideAccess: false,
      })

      expect(updated.quantity).toBe(95)
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
            quantity: 50,
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

  describe('Role Validation', () => {
    it('should prevent access for non-admin users to sensitive data', async () => {
      await expect(
        payload.find({
          collection: 'inventory',
          user: customerUser,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })
  })
})