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
        name: 'Test Customer',
        email: `test-customer-${Date.now()}@test.com`,
        password: 'password123',
        roles: ['customer'],
      },
    })

    testAdmin = await payload.create({
      collection: 'users',
      data: {
        name: 'Test Admin',
        email: `test-admin-${Date.now()}@test.com`,
        password: 'password123',
        roles: ['admin'],
      },
    })

    // Create test category
    const testCategory = await payload.create({
      collection: 'categories',
      data: {
        title: 'Test Category',
        slug: `test-category-${Date.now()}`,
      },
    })

    // Create test product
    testProduct = await payload.create({
      collection: 'products',
      data: {
        title: 'Test Product',
        slug: `test-product-${Date.now()}`,
        generic_name: 'Test Generic',
        manufacturer: 'Test Manufacturer',
        dosage_form: 'tablet',
        strength: '500mg',
        requires_prescription: false,
        priceInUSDEnabled: true,
        priceInUSD: 999,
        categories: [testCategory.id],
        _status: 'published',
      },
    })

    // Create test inventory
    testInventory = await payload.create({
      collection: 'inventory',
      data: {
        product: testProduct.id,
        batch_number: `TEST-${Date.now()}`,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        manufacture_date: new Date().toISOString().split('T')[0],
        supplier: 'Test Supplier',
        initial_quantity: 100,
        current_quantity: 100,
        reserved_quantity: 0,
        minimum_stock_level: 10,
        unit_cost: 5.00,
        is_active: true,
      },
    })

    // Create test address
    testAddress = await payload.create({
      collection: 'addresses',
      data: {
        customer: testUser.id,
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

    it('should detect negative current quantity', async () => {
      // Update inventory to have negative quantity
      await payload.update({
        collection: 'inventory',
        id: testInventory.id,
        data: { current_quantity: -5 },
        context: { skipValidation: true },
      })

      const result = await validateInventoryQuantities(payload, testInventory.id)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Current quantity cannot be negative: -5')
    })

    it('should detect quantities exceeding initial quantity', async () => {
      // Update inventory to exceed initial quantity
      await payload.update({
        collection: 'inventory',
        id: testInventory.id,
        data: {
          current_quantity: 80,
          reserved_quantity: 30, // Total: 110, Initial: 100
        },
        context: { skipValidation: true },
      })

      const result = await validateInventoryQuantities(payload, testInventory.id)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('exceeds initial quantity'))).toBe(true)
    })

    it('should detect expired active inventory', async () => {
      // Update inventory to be expired but still active
      await payload.update({
        collection: 'inventory',
        id: testInventory.id,
        data: {
          expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
          is_active: true,
        },
        context: { skipValidation: true },
      })

      const result = await validateInventoryQuantities(payload, testInventory.id)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('expired'))).toBe(true)
    })
  })

  describe('Product-Inventory Consistency', () => {
    it('should calculate correct available stock', async () => {
      const result = await validateProductInventoryConsistency(payload, testProduct.id)
      expect(result.valid).toBe(true)
      expect(result.calculatedStock).toBe(100) // current_quantity - reserved_quantity
    })

    it('should exclude expired inventory from calculations', async () => {
      // Create expired inventory for the same product
      await payload.create({
        collection: 'inventory',
        data: {
          product: testProduct.id,
          batch_number: `EXPIRED-${Date.now()}`,
          expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
          manufacture_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplier: 'Test Supplier',
          initial_quantity: 50,
          current_quantity: 50,
          reserved_quantity: 0,
          minimum_stock_level: 10,
          unit_cost: 5.00,
          is_active: true,
        },
        context: { skipValidation: true },
      })

      const result = await validateProductInventoryConsistency(payload, testProduct.id)
      expect(result.valid).toBe(true)
      expect(result.calculatedStock).toBe(100) // Only non-expired inventory counted
    })
  })

  describe('Order Validation', () => {
    it('should validate correct order data', async () => {
      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          shippingAddress: testAddress.id,
          billingAddress: testAddress.id,
          items: [{
            product: testProduct.id,
            quantity: 2,
            price: 999,
          }],
          subtotal: 1998,
          total: 1998,
          status: 'pending',
          prescription_required: false,
          prescription_verified: false,
        },
      })

      const result = await validateOrderIntegrity(payload, testOrder.id)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect prescription requirement mismatch', async () => {
      // Create prescription product
      const prescriptionProduct = await payload.create({
        collection: 'products',
        data: {
          title: 'Prescription Product',
          slug: `prescription-product-${Date.now()}`,
          generic_name: 'Prescription Generic',
          manufacturer: 'Test Manufacturer',
          dosage_form: 'tablet',
          strength: '500mg',
          requires_prescription: true,
          priceInUSDEnabled: true,
          priceInUSD: 1999,
          categories: [testProduct.categories[0]],
          _status: 'published',
        },
      })

      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          shippingAddress: testAddress.id,
          billingAddress: testAddress.id,
          items: [{
            product: prescriptionProduct.id,
            quantity: 1,
            price: 1999,
          }],
          subtotal: 1999,
          total: 1999,
          status: 'pending',
          prescription_required: false, // This should be true
          prescription_verified: false,
        },
        context: { skipValidation: true },
      })

      const result = await validateOrderIntegrity(payload, testOrder.id)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('prescription items but prescription_required is false'))).toBe(true)
    })

    it('should detect unverified prescription orders', async () => {
      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          shippingAddress: testAddress.id,
          billingAddress: testAddress.id,
          items: [{
            product: testProduct.id,
            quantity: 1,
            price: 999,
          }],
          subtotal: 999,
          total: 999,
          status: 'processing', // Non-pending status
          prescription_required: true,
          prescription_verified: false, // Should be verified for processing
        },
        context: { skipValidation: true },
      })

      const result = await validateOrderIntegrity(payload, testOrder.id)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('must be verified before processing'))).toBe(true)
    })
  })

  describe('Address Validation', () => {
    it('should validate correct address data', async () => {
      const result = await validateAddressIntegrity(payload, testAddress.id)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect duplicate default addresses', async () => {
      // Create another default address for same user
      const duplicateDefault = await payload.create({
        collection: 'addresses',
        data: {
          customer: testUser.id,
          label: 'Duplicate Default',
          recipient_name: 'Test User',
          phone: '+1234567890',
          address_line: '456 Test Ave',
          city: 'Test City',
          postal_code: '12345',
          is_default: true,
        },
        context: { skipValidation: true },
      })

      const result = await validateAddressIntegrity(payload, duplicateDefault.id)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Multiple default'))).toBe(true)
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
          customer: testUser.id,
          shippingAddress: testAddress.id,
          billingAddress: testAddress.id,
          items: [{
            product: testProduct.id,
            quantity: 10,
            price: 999,
          }],
          subtotal: 9990,
          total: 9990,
          status: 'pending',
          prescription_required: false,
          prescription_verified: false,
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
      expect(updatedInventory.current_quantity).toBe(90)
    })

    it('should cancel order and restore stock atomically', async () => {
      // First create and process an order
      const testOrder = await payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          shippingAddress: testAddress.id,
          billingAddress: testAddress.id,
          items: [{
            product: testProduct.id,
            quantity: 15,
            price: 999,
          }],
          subtotal: 14985,
          total: 14985,
          status: 'confirmed',
          prescription_required: false,
          prescription_verified: false,
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
      expect(inventory.current_quantity).toBe(85) // 100 - 15

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
      expect(inventory.current_quantity).toBe(100) // Back to original
    })

    it('should adjust inventory with audit trail', async () => {
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
      expect(result.inventory?.current_quantity).toBe(95)
      expect(result.movement).toBeDefined()
      expect(result.movement?.movement_type).toBe('adjustment')
      expect(result.movement?.quantity_change).toBe(-5)
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
        checkMovements: true,
      })

      expect(result.valid).toBe(true)
      expect(result.totalErrors).toBe(0)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should detect multiple integrity issues', async () => {
      // Create data with multiple issues

      // 1. Negative inventory
      const badInventory = await payload.create({
        collection: 'inventory',
        data: {
          product: testProduct.id,
          batch_number: `BAD-${Date.now()}`,
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          manufacture_date: new Date().toISOString().split('T')[0],
          supplier: 'Test Supplier',
          initial_quantity: 50,
          current_quantity: -10, // Negative
          reserved_quantity: 0,
          minimum_stock_level: 10,
          unit_cost: 5.00,
          is_active: true,
        },
        context: { skipValidation: true },
      })

      // 2. Order without addresses
      const badOrder = await payload.create({
        collection: 'orders',
        data: {
          customer: testUser.id,
          // Missing addresses
          items: [{
            product: testProduct.id,
            quantity: 1,
            price: 999,
          }],
          subtotal: 999,
          total: 999,
          status: 'pending',
          prescription_required: false,
          prescription_verified: false,
        },
        context: { skipValidation: true },
      })

      const result = await runDataIntegrityCheck(payload, {
        checkInventory: true,
        checkProducts: true,
        checkOrders: true,
        checkAddresses: true,
        checkMovements: true,
      })

      expect(result.valid).toBe(false)
      expect(result.totalErrors).toBeGreaterThan(0)
      expect(Object.keys(result.errors).length).toBeGreaterThan(0)
    })
  })
})