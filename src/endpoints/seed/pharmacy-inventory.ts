import type { Product } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type InventoryArgs = {
  product: Product
}

// Helper function to generate future dates
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

// Paracetamol Inventory - Multiple batches with different expiry dates
export const paracetamolInventoryBatch1: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'PAR001-2024',
  expiry_date: addMonths(new Date(), 18).toISOString().split('T')[0], // 18 months from now
  manufacture_date: addMonths(new Date(), -6).toISOString().split('T')[0], // 6 months ago
  supplier: 'PharmaCorp Manufacturing',
  initial_quantity: 500,
  current_quantity: 342,
  reserved_quantity: 0,
  minimum_stock_level: 50,
  unit_cost: 2.50,
  is_active: true,
})

export const paracetamolInventoryBatch2: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'PAR002-2024',
  expiry_date: addMonths(new Date(), 24).toISOString().split('T')[0], // 24 months from now
  manufacture_date: addMonths(new Date(), -2).toISOString().split('T')[0], // 2 months ago
  supplier: 'PharmaCorp Manufacturing',
  initial_quantity: 300,
  current_quantity: 300,
  reserved_quantity: 0,
  minimum_stock_level: 50,
  unit_cost: 2.45,
  is_active: true,
})

// Amoxicillin Inventory - Lower stock, prescription required
export const amoxicillinInventoryBatch1: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'AMX001-2024',
  expiry_date: addMonths(new Date(), 12).toISOString().split('T')[0], // 12 months from now
  manufacture_date: addMonths(new Date(), -3).toISOString().split('T')[0], // 3 months ago
  supplier: 'MediPharm Ltd',
  initial_quantity: 200,
  current_quantity: 45,
  reserved_quantity: 5,
  minimum_stock_level: 25,
  unit_cost: 8.75,
  is_active: true,
})

// Vitamin C Inventory - High stock, popular item
export const vitaminCInventoryBatch1: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'VTC001-2024',
  expiry_date: addMonths(new Date(), 30).toISOString().split('T')[0], // 30 months from now
  manufacture_date: addMonths(new Date(), -1).toISOString().split('T')[0], // 1 month ago
  supplier: 'HealthPlus Vitamins',
  initial_quantity: 1000,
  current_quantity: 756,
  reserved_quantity: 12,
  minimum_stock_level: 100,
  unit_cost: 4.25,
  is_active: true,
})

export const vitaminCInventoryBatch2: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'VTC002-2024',
  expiry_date: addMonths(new Date(), 36).toISOString().split('T')[0], // 36 months from now
  manufacture_date: new Date().toISOString().split('T')[0], // Today
  supplier: 'HealthPlus Vitamins',
  initial_quantity: 500,
  current_quantity: 500,
  reserved_quantity: 0,
  minimum_stock_level: 100,
  unit_cost: 4.15,
  is_active: true,
})

// Cough Syrup Inventory - Seasonal item
export const coughSyrupInventoryBatch1: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'CSY001-2024',
  expiry_date: addMonths(new Date(), 15).toISOString().split('T')[0], // 15 months from now
  manufacture_date: addMonths(new Date(), -4).toISOString().split('T')[0], // 4 months ago
  supplier: 'CoughCare Pharmaceuticals',
  initial_quantity: 150,
  current_quantity: 89,
  reserved_quantity: 3,
  minimum_stock_level: 20,
  unit_cost: 3.75,
  is_active: true,
})

// Ibuprofen Inventory - Multiple batches, one near expiry
export const ibuprofenInventoryBatch1: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'IBU001-2023',
  expiry_date: addMonths(new Date(), 3).toISOString().split('T')[0], // 3 months from now (near expiry)
  manufacture_date: addMonths(new Date(), -21).toISOString().split('T')[0], // 21 months ago
  supplier: 'PharmaCorp Manufacturing',
  initial_quantity: 400,
  current_quantity: 67,
  reserved_quantity: 0,
  minimum_stock_level: 50,
  unit_cost: 3.25,
  is_active: true,
})

export const ibuprofenInventoryBatch2: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'IBU002-2024',
  expiry_date: addMonths(new Date(), 20).toISOString().split('T')[0], // 20 months from now
  manufacture_date: addMonths(new Date(), -4).toISOString().split('T')[0], // 4 months ago
  supplier: 'PharmaCorp Manufacturing',
  initial_quantity: 600,
  current_quantity: 523,
  reserved_quantity: 8,
  minimum_stock_level: 50,
  unit_cost: 3.15,
  is_active: true,
})

// Low stock item for testing alerts
export const lowStockInventoryBatch: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'LOW001-2024',
  expiry_date: addMonths(new Date(), 8).toISOString().split('T')[0], // 8 months from now
  manufacture_date: addMonths(new Date(), -7).toISOString().split('T')[0], // 7 months ago
  supplier: 'Test Supplier',
  initial_quantity: 100,
  current_quantity: 8, // Below minimum stock level
  reserved_quantity: 2,
  minimum_stock_level: 25,
  unit_cost: 5.00,
  is_active: true,
})

// Expired inventory for testing (should not be available for sale)
export const expiredInventoryBatch: (
  args: InventoryArgs,
) => RequiredDataFromCollectionSlug<'inventory'> = ({ product }) => ({
  product: product.id,
  batch_number: 'EXP001-2023',
  expiry_date: addDays(new Date(), -30).toISOString().split('T')[0], // 30 days ago (expired)
  manufacture_date: addMonths(new Date(), -30).toISOString().split('T')[0], // 30 months ago
  supplier: 'Test Supplier',
  initial_quantity: 50,
  current_quantity: 15,
  reserved_quantity: 0,
  minimum_stock_level: 10,
  unit_cost: 2.00,
  is_active: false, // Inactive due to expiry
})