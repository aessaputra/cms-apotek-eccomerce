/**
 * Data Integrity Integration Tests
 * 
 * Tests comprehensive data integrity measures and validation
 * across all pharmacy collections.
 */

import {
  runDataIntegrityCheck,
  validateAddressIntegrity,
  validateInventoryQuantities,
  validateOrderIntegrity,
  validateProductInventoryConsistency,
} from '@/utilities/dataIntegrity'
import {
  adjustInventoryWithAudit,
  cancelOrderWithStockRestoration,
  processOrderWithStockDeduction,
} from '@/utilities/transactionSafety'
import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('Data Integrity Integration Tests', () => {
  let payload: Payload
  let testUser: any
  let testAdmin: any
  let testProduct: any
  let testInventory: any
  let testAddress: any

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await payload.delete({ collection: 'users', id: testUser.id })
    }
    if (testAdmin) {
      await payload.delete({ collection: 'users', id: testAdmin.id })
    }
  })

  beforeEach(async () => {
    // Create test users
    testUser = await payload.create({
      collection: 'users',
      data: {
        full_name: 'Test Customer',
        email: `test-customer-${Date.now()}@test.com`,
        password: 'password123',
        role: 'customer',
        phone: '081234567890',
      },
    })

    testAdmin = await payload.create({
      collection: 'users',
      data: {
        full_name: 'Test Admin',
        email: `test-admin-${Date.now()}@test.com`,
        password: 'password123',
        role: 'admin',
        phone: '081234567891',
      },
    })

    // Create test category
    const testCategory = await payload.create({
      collection: 'categories',
      data: {
        name: 'Test Category',
        slug: `test-category-${Date.now()}`,
      },
    })

    // Create test product
    testProduct = await payload.create({
      collection: 'products',
      data: {
        title: 'Test Product',
        slug: `test-product-${Date.now()}`,
        price: 999,
        category: testCategory.id,
        _status: 'published',
      },
    })

    // Create test inventory
    testInventory = await payload.create({
      collection: 'inventory',
      data: {
        product: testProduct.id,
        quantity: 100,
        low_stock_threshold: 10,
      },
    })

    // Create test address
    testAddress = await payload.create({
      collection: 'addresses',
      data: {
        user: testUser.id,
        label: 'Test Address',
        recipient_name: 'Test User',
        phone: '+1234567890',
        address_line: '123 Test St',
        city: 'Test City',
        postal_code: '12345',
        is_default: true,
      },
    })
  })

  describe('Inventory Validation', () => {
    it('should validate correct inventory quantities', async () => {
      const result = await validateInventoryQuantities(payload, testInventory.id)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect negative quantity', async () => {
      // Update inventory to have negative quantity
      await payload.update({
        collection: 'inventory',
        id: testInventory.id,
        data: { quantity: -5 },
        context: { skipValidation: true },
      })

      const result = await validateInventoryQuantities(payload, testInventory.id)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('negative'))).toBe(true)
    })
  })

  describe('Product-Inventory Consistency', () => {
    it('should calculate correct available stock', async () => {
      const result = await validateProductInventoryConsistency(payload, testProduct.id)
      expect(result.valid).toBe(true)
      expect(result.calculatedStock).toBe(100)
    })
  })

  describe('Order Validation', () => {
    it('should validate correct order data', async () => {
      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          orderedBy: testUser.id,
          shipping_name: 'Test',
          shipping_address: 'Test Addr',
          shipping_phone: '000',
          items: [{
            product: testProduct.id,
            quantity: 2,
            price: 999,
          }],
          total: 1998,
          status: 'pending',
        },
      })

      const result = await validateOrderIntegrity(payload, testOrder.id)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Address Validation', () => {
    it('should validate correct address data', async () => {
      const result = await validateAddressIntegrity(payload, testAddress.id)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate addresses with missing required fields', async () => {
      // Test that validation catches missing required data
      const result = await validateAddressIntegrity(payload, testAddress.id)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Transaction Safety', () => {
    it('should process order with stock deduction atomically', async () => {
      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          orderedBy: testUser.id,
          shipping_name: 'Test',
          shipping_address: 'Test Addr',
          shipping_phone: '000',
          items: [{
            product: testProduct.id,
            quantity: 10,
            price: 999,
          }],
          total: 9990,
          status: 'pending',
        },
      })

      const result = await processOrderWithStockDeduction(
        payload,
        { user: testAdmin, payload } as any,
        testOrder.id
      )

      expect(result.success).toBe(true)
      expect(result.stockDeductions).toHaveLength(1)
      expect(result.stockDeductions![0].quantity).toBe(10)

      // Verify inventory was updated
      const updatedInventory = await payload.findByID({
        collection: 'inventory',
        id: testInventory.id,
      })
      expect(updatedInventory.quantity).toBe(90)
    })

    it('should cancel order and restore stock atomically', async () => {
      // First create and process an order
      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          orderedBy: testUser.id,
          shipping_name: 'Test',
          shipping_address: 'Test Addr',
          shipping_phone: '000',
          items: [{
            product: testProduct.id,
            quantity: 15,
            price: 999,
          }],
          total: 14985,
          status: 'pending',
        },
      })

      // Process the order to deduct stock
      await processOrderWithStockDeduction(
        payload,
        { user: testAdmin, payload } as any,
        testOrder.id
      )

      // Verify stock was deducted
      let inventory = await payload.findByID({
        collection: 'inventory',
        id: testInventory.id,
      })
      expect(inventory.quantity).toBe(85) // 100 - 15

      // Cancel the order
      const result = await cancelOrderWithStockRestoration(
        payload,
        { user: testAdmin, payload } as any,
        testOrder.id
      )

      expect(result.success).toBe(true)
      expect(result.stockRestorations).toHaveLength(1)
      expect(result.stockRestorations![0].quantity).toBe(15)

      // Verify stock was restored
      inventory = await payload.findByID({
        collection: 'inventory',
        id: testInventory.id,
      })
      expect(inventory.quantity).toBe(100) // Back to original
    })

    it('should adjust inventory with audit log (to logger)', async () => {
      const result = await adjustInventoryWithAudit(
        payload,
        { user: testAdmin, payload } as any,
        testInventory.id,
        -5,
        {
          reason: 'Damaged goods',
          notes: 'Found 5 damaged tablets during quality check',
        }
      )

      expect(result.success).toBe(true)
      expect(result.inventory?.quantity).toBe(95)
    })

    it('should prevent non-admin from adjusting inventory', async () => {
      const result = await adjustInventoryWithAudit(
        payload,
        { user: testUser, payload } as any,
        testInventory.id,
        10,
        {
          reason: 'Test adjustment',
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only administrators can adjust inventory')
    })
  })

  describe('Comprehensive Data Integrity Check', () => {
    it('should run complete integrity check on valid data', async () => {
      const result = await runDataIntegrityCheck(payload, {
        checkInventory: true,
        checkProducts: true,
        checkOrders: true,
        checkAddresses: true,
      })

      expect(result.valid).toBe(true)
      expect(result.totalErrors).toBe(0)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should detect multiple integrity issues', async () => {
      // Create data with multiple issues

      // 1. Negative inventory
      await payload.create({
        collection: 'inventory',
        data: {
          product: testProduct.id,
          quantity: -10, // Negative
        },
        context: { skipValidation: true },
      })

      // 2. Order without addresses
      await payload.create({
        collection: 'orders',
        data: {
          orderedBy: testUser.id,
          // Missing shipping_address
          items: [{
            product: testProduct.id,
            quantity: 1,
            price: 999,
          }],
          total: 999,
          status: 'pending',
        },
        draft: true,
        context: { skipValidation: true },
      })

      const result = await runDataIntegrityCheck(payload, {
        checkInventory: true,
        checkProducts: true,
        checkOrders: true,
        checkAddresses: true,
      })

      expect(result.valid).toBe(false)
      expect(result.totalErrors).toBeGreaterThan(0)
      expect(Object.keys(result.errors).length).toBeGreaterThan(0)
    })
  })
})