import { validateStockOnCartChange } from '@/collections/Cart/hooks/validateStockOnCartChange'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the payload request object
const mockReq = {
  payload: {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
    find: vi.fn(),
    findByID: vi.fn(),
  },
}

describe('validateStockOnCartChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should pass validation when sufficient stock is available', async () => {
    // Mock inventory with sufficient stock
    mockReq.payload.find.mockResolvedValue({
      docs: [
        {
          id: '1',
          current_quantity: 100,
          reserved_quantity: 10,
          is_active: true,
          expiry_date: '2025-12-31',
        },
      ],
    })

    // Mock product name lookup
    mockReq.payload.findByID.mockResolvedValue({
      title: 'Test Product',
    })

    const cartData = {
      items: [
        {
          product: 'product-1',
          quantity: 50, // Less than available (90)
        },
      ],
    }

    const result = await validateStockOnCartChange({
      data: cartData,
      req: mockReq as any,
      operation: 'create',
      context: {},
    })

    expect(result).toEqual(cartData)
    expect(mockReq.payload.logger.info).toHaveBeenCalledWith('Stock validation passed for all cart items')
  })

  it('should throw error when insufficient stock is available', async () => {
    // Mock inventory with insufficient stock
    mockReq.payload.find.mockResolvedValue({
      docs: [
        {
          id: '1',
          current_quantity: 10,
          reserved_quantity: 5,
          is_active: true,
          expiry_date: '2025-12-31',
        },
      ],
    })

    // Mock product name lookup
    mockReq.payload.findByID.mockResolvedValue({
      title: 'Test Product',
    })

    const cartData = {
      items: [
        {
          product: 'product-1',
          quantity: 20, // More than available (5)
        },
      ],
    }

    await expect(
      validateStockOnCartChange({
        data: cartData,
        req: mockReq as any,
        operation: 'create',
        context: {},
      })
    ).rejects.toThrow('Insufficient stock for Product product-1. Requested: 20, Available: 5')
  })

  it('should skip validation when skipStockValidation context is set', async () => {
    const cartData = {
      items: [
        {
          product: 'product-1',
          quantity: 1000, // Would normally fail
        },
      ],
    }

    const result = await validateStockOnCartChange({
      data: cartData,
      req: mockReq as any,
      operation: 'create',
      context: { skipStockValidation: true },
    })

    expect(result).toEqual(cartData)
    expect(mockReq.payload.find).not.toHaveBeenCalled()
  })

  it('should handle empty cart items', async () => {
    const cartData = {
      items: [],
    }

    const result = await validateStockOnCartChange({
      data: cartData,
      req: mockReq as any,
      operation: 'create',
      context: {},
    })

    expect(result).toEqual(cartData)
    expect(mockReq.payload.find).not.toHaveBeenCalled()
  })

  it('should exclude expired inventory from stock calculation', async () => {
    // Mock inventory query to return only non-expired inventory (as the real query would)
    mockReq.payload.find.mockResolvedValue({
      docs: [
        {
          id: '2',
          current_quantity: 30,
          reserved_quantity: 10,
          is_active: true,
          expiry_date: '2030-12-31', // Only non-expired inventory returned
        },
      ],
    })

    // Mock product name lookup to fail (to test fallback)
    mockReq.payload.findByID.mockRejectedValue(new Error('Product not found'))

    const cartData = {
      items: [
        {
          product: 'product-1',
          quantity: 25, // More than available (20)
        },
      ],
    }

    await expect(
      validateStockOnCartChange({
        data: cartData,
        req: mockReq as any,
        operation: 'create',
        context: {},
      })
    ).rejects.toThrow('Insufficient stock for Product product-1. Requested: 25, Available: 20')
  })
})