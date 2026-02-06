import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Integration tests for user data access control
 * 
 * Requirements tested:
 * - 7.1: Users can only access their own addresses
 * - 7.2: Users can only access their own orders
 * - 7.2: Users can only access their own carts
 * 
 * These tests verify that the access control system properly isolates user data
 * and prevents unauthorized access to other users' information.
 */

describe('User Data Access Control', () => {
  let payload: Payload
  let adminUser: any
  let customerUser1: any
  let customerUser2: any
  let customer1Address: any
  let customer2Address: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    // Create a category
    const category = await payload.create({
      collection: 'categories',
      data: {
        name: 'Test Category',
      },
    })

    // Create admin user
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'admin-access-test@example.com',
        password: 'test123456',
        full_name: 'Admin User',
        phone: '+1234567890',
        role: 'admin',
      },
    })

    // Create customer users
    customerUser1 = await payload.create({
      collection: 'users',
      data: {
        email: 'customer1-access-test@example.com',
        password: 'test123456',
        full_name: 'Customer One',
        phone: '+1234567891',
        role: 'customer',
      },
    })

    customerUser2 = await payload.create({
      collection: 'users',
      data: {
        email: 'customer2-access-test@example.com',
        password: 'test123456',
        full_name: 'Customer Two',
        phone: '+1234567892',
        role: 'customer',
      },
    })

    // Create addresses for each customer
    customer1Address = await payload.create({
      collection: 'addresses',
      data: {
        user: customerUser1.id,
        label: 'Home',
        recipient_name: 'Customer One',
        phone: '+1234567891',
        address_line: '123 Main St',
        city: 'Jakarta',
        postal_code: '12345',
      },
    })

    customer2Address = await payload.create({
      collection: 'addresses',
      data: {
        user: customerUser2.id,
        label: 'Home',
        recipient_name: 'Customer Two',
        phone: '+1234567892',
        address_line: '456 Oak Ave',
        city: 'Bandung',
        postal_code: '54321',
      },
    })
  })

  afterAll(async () => {
    // Clean up test data
    if (customer1Address?.id) {
      await payload.delete({ collection: 'addresses', id: customer1Address.id })
    }
    if (customer2Address?.id) {
      await payload.delete({ collection: 'addresses', id: customer2Address.id })
    }
    if (customerUser1?.id) {
      await payload.delete({ collection: 'users', id: customerUser1.id })
    }
    if (customerUser2?.id) {
      await payload.delete({ collection: 'users', id: customerUser2.id })
    }
    if (adminUser?.id) {
      await payload.delete({ collection: 'users', id: adminUser.id })
    }
  })

  describe('Address Access Control (Requirement 7.1)', () => {
    it('should allow customers to read only their own addresses', async () => {
      const result = await payload.find({
        collection: 'addresses',
        user: customerUser1,
        overrideAccess: false,
      })

      expect(result.docs).toHaveLength(1)
      expect(result.docs[0].id).toBe(customer1Address.id)
      expect(result.docs[0].user).toBe(customerUser1.id)
    })

    it('should prevent customers from reading other customers\' addresses', async () => {
      const result = await payload.find({
        collection: 'addresses',
        user: customerUser1,
        overrideAccess: false,
        where: {
          id: {
            equals: customer2Address.id,
          },
        },
      })

      expect(result.docs).toHaveLength(0)
    })

    it('should allow admins to read all addresses', async () => {
      const result = await payload.find({
        collection: 'addresses',
        user: adminUser,
        overrideAccess: false,
      })

      expect(result.docs.length).toBeGreaterThanOrEqual(2)
      const addressIds = result.docs.map((doc: any) => doc.id)
      expect(addressIds).toContain(customer1Address.id)
      expect(addressIds).toContain(customer2Address.id)
    })

    it('should prevent customers from updating other customers\' addresses', async () => {
      await expect(
        payload.update({
          collection: 'addresses',
          id: customer2Address.id,
          data: {
            label: 'Hacked Address',
          },
          user: customerUser1,
          overrideAccess: false,
        })
      ).rejects.toThrow()
    })

    it('should allow customers to update their own addresses', async () => {
      const updated = await payload.update({
        collection: 'addresses',
        id: customer1Address.id,
        data: {
          label: 'Updated Home',
        },
        user: customerUser1,
        overrideAccess: false,
      })

      expect(updated.label).toBe('Updated Home')
    })
  })

  describe('Order Access Control (Requirement 7.2)', () => {
    let customer1Order: any
    let customer2Order: any

    beforeAll(async () => {
      // Create a category
      const category = await payload.create({
        collection: 'categories',
        data: {
          name: 'Order Test Category',
        },
      })

      // Create test products
      const product = await payload.create({
        collection: 'products',
        data: {
          title: 'Test Product for Orders',
          slug: 'test-product-orders-access',
          _status: 'published',
          category: category.id,
          price: 100,
        },
      })

      // Create orders for each customer
      customer1Order = await payload.create({
        collection: 'orders',
        data: {
          orderedBy: customerUser1.id,
          items: [
            {
              product: product.id,
              price: 100,
              quantity: 1,
            },
          ],
          total: 100,
          shipping_name: 'Test',
          shipping_address: 'Test Addr',
          shipping_phone: '000',
          status: 'pending',
        },
      })

      customer2Order = await payload.create({
        collection: 'orders',
        data: {
          orderedBy: customerUser2.id,
          items: [
            {
              product: product.id,
              price: 100,
              quantity: 1,
            },
          ],
          total: 100,
          shipping_name: 'Test',
          shipping_address: 'Test Addr',
          shipping_phone: '000',
          status: 'pending',
        },
      })
    })

    afterAll(async () => {
      if (customer1Order?.id) {
        await payload.delete({ collection: 'orders', id: customer1Order.id })
      }
      if (customer2Order?.id) {
        await payload.delete({ collection: 'orders', id: customer2Order.id })
      }
    })

    it('should allow customers to read only their own orders', async () => {
      const result = await payload.find({
        collection: 'orders',
        user: customerUser1,
        overrideAccess: false,
      })

      const customer1Orders = result.docs.filter((doc: any) => doc.orderedBy === customerUser1.id || doc.orderedBy?.id === customerUser1.id)
      expect(customer1Orders.length).toBeGreaterThanOrEqual(1)

      const hasOtherCustomerOrders = result.docs.some((doc: any) => doc.orderedBy === customerUser2.id || doc.orderedBy?.id === customerUser2.id)
      expect(hasOtherCustomerOrders).toBe(false)
    })

    it('should prevent customers from reading other customers\' orders', async () => {
      const result = await payload.find({
        collection: 'orders',
        user: customerUser1,
        overrideAccess: false,
        where: {
          id: {
            equals: customer2Order.id,
          },
        },
      })

      expect(result.docs).toHaveLength(0)
    })

    it('should allow admins to read all orders', async () => {
      const result = await payload.find({
        collection: 'orders',
        user: adminUser,
        overrideAccess: false,
      })

      expect(result.docs.length).toBeGreaterThanOrEqual(2)
      const orderIds = result.docs.map((doc: any) => doc.id)
      expect(orderIds).toContain(customer1Order.id)
      expect(orderIds).toContain(customer2Order.id)
    })
  })

  describe('Cart Access Control (Requirement 7.2)', () => {
    let customer1Cart: any
    let customer2Cart: any

    beforeAll(async () => {
      // Create a category
      const category = await payload.create({
        collection: 'categories',
        data: {
          name: 'Cart Test Category',
        },
      })

      // Create test products
      const product = await payload.create({
        collection: 'products',
        data: {
          title: 'Test Product for Carts',
          slug: 'test-product-carts-access',
          _status: 'published',
          category: category.id,
          price: 50,
        },
      })

      // Create carts for each customer
      customer1Cart = await payload.create({
        collection: 'carts',
        data: {
          customer: customerUser1.id,
          items: [
            {
              product: product.id,
              quantity: 2,
            },
          ],
        },
      })

      customer2Cart = await payload.create({
        collection: 'carts',
        data: {
          customer: customerUser2.id,
          items: [
            {
              product: product.id,
              quantity: 1,
            },
          ],
        },
      })
    })

    afterAll(async () => {
      if (customer1Cart?.id) {
        await payload.delete({ collection: 'carts', id: customer1Cart.id })
      }
      if (customer2Cart?.id) {
        await payload.delete({ collection: 'carts', id: customer2Cart.id })
      }
    })

    it('should allow customers to read only their own carts', async () => {
      const result = await payload.find({
        collection: 'carts',
        user: customerUser1,
        overrideAccess: false,
      })

      const customer1Carts = result.docs.filter((doc: any) => doc.customer === customerUser1.id)
      expect(customer1Carts.length).toBeGreaterThanOrEqual(1)

      const hasOtherCustomerCarts = result.docs.some((doc: any) => doc.customer === customerUser2.id)
      expect(hasOtherCustomerCarts).toBe(false)
    })

    it('should prevent customers from reading other customers\' carts', async () => {
      const result = await payload.find({
        collection: 'carts',
        user: customerUser1,
        overrideAccess: false,
        where: {
          id: {
            equals: customer2Cart.id,
          },
        },
      })

      expect(result.docs).toHaveLength(0)
    })

    it('should allow admins to read all carts', async () => {
      const result = await payload.find({
        collection: 'carts',
        user: adminUser,
        overrideAccess: false,
      })

      expect(result.docs.length).toBeGreaterThanOrEqual(2)
      const cartIds = result.docs.map((doc: any) => doc.id)
      expect(cartIds).toContain(customer1Cart.id)
      expect(cartIds).toContain(customer2Cart.id)
    })
  })
})
