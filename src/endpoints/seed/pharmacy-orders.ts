import type { Address, Product, User } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type OrderArgs = {
  customer: User
  admin?: User
  shippingAddress: Address
  billingAddress?: Address
  products: {
    paracetamol?: Product
    amoxicillin?: Product
    vitaminC?: Product
    coughSyrup?: Product
    ibuprofen?: Product
  }
}

// Helper function to convert Address to order address format
const convertAddressForOrder = (address: Address) => ({
  title: address.title,
  firstName: address.firstName,
  lastName: address.lastName,
  company: address.company,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  phone: address.phone,
})

// Regular OTC Order (No prescription required)
export const otcOrder: (
  args: OrderArgs,
) => RequiredDataFromCollectionSlug<'orders'> = ({ 
  customer, 
  shippingAddress, 
  billingAddress, 
  products 
}) => ({
  customer: customer.id,
  shippingAddress: convertAddressForOrder(shippingAddress),
  billingAddress: billingAddress ? convertAddressForOrder(billingAddress) : convertAddressForOrder(shippingAddress),
  
  // Order items
  items: [
    ...(products.paracetamol ? [{
      product: products.paracetamol.id,
      quantity: 2,
      price: 599, // $5.99 per item
    }] : []),
    ...(products.vitaminC ? [{
      product: products.vitaminC.id,
      quantity: 1,
      price: 899, // $8.99 per item
    }] : []),
    ...(products.coughSyrup ? [{
      product: products.coughSyrup.id,
      quantity: 1,
      price: 749, // $7.49 per item
    }] : []),
  ],
  
  // Pricing
  subtotal: 2047, // $20.47
  tax: 204, // 10% tax
  shipping: 500, // $5.00 shipping
  total: 2751, // $27.51
  
  // Order status
  status: 'processing',
  
  // Prescription fields
  prescription_required: false,
  prescription_verified: false,
  
  // Payment
  paymentStatus: 'paid',
  
  // Metadata
  notes: 'Standard over-the-counter medication order',
})

// Prescription Order (Requires verification)
export const prescriptionOrder: (
  args: OrderArgs,
) => RequiredDataFromCollectionSlug<'orders'> = ({ 
  customer, 
  admin,
  shippingAddress, 
  billingAddress, 
  products 
}) => ({
  customer: customer.id,
  shippingAddress: convertAddressForOrder(shippingAddress),
  billingAddress: billingAddress ? convertAddressForOrder(billingAddress) : convertAddressForOrder(shippingAddress),
  
  // Order items
  items: [
    ...(products.amoxicillin ? [{
      product: products.amoxicillin.id,
      quantity: 1,
      price: 1299, // $12.99 per item
    }] : []),
    ...(products.paracetamol ? [{
      product: products.paracetamol.id,
      quantity: 1,
      price: 599, // $5.99 per item
    }] : []),
  ],
  
  // Pricing
  subtotal: 1898, // $18.98
  tax: 190, // 10% tax
  shipping: 500, // $5.00 shipping
  total: 2588, // $25.88
  
  // Order status
  status: 'processing',
  
  // Prescription fields
  prescription_required: true,
  prescription_verified: true,
  verified_by: admin?.id,
  prescription_notes: 'Prescription verified for Amoxicillin 500mg. Patient ID: P12345. Valid until: 2024-12-31.',
  
  // Payment
  paymentStatus: 'paid',
  
  // Metadata
  notes: 'Prescription order - antibiotic treatment for bacterial infection',
})

// Pending Prescription Order (Awaiting verification)
export const pendingPrescriptionOrder: (
  args: OrderArgs,
) => RequiredDataFromCollectionSlug<'orders'> = ({ 
  customer, 
  shippingAddress, 
  billingAddress, 
  products 
}) => ({
  customer: customer.id,
  shippingAddress: convertAddressForOrder(shippingAddress),
  billingAddress: billingAddress ? convertAddressForOrder(billingAddress) : convertAddressForOrder(shippingAddress),
  
  // Order items
  items: [
    ...(products.amoxicillin ? [{
      product: products.amoxicillin.id,
      quantity: 2,
      price: 1299, // $12.99 per item
    }] : []),
  ],
  
  // Pricing
  subtotal: 2598, // $25.98
  tax: 260, // 10% tax
  shipping: 500, // $5.00 shipping
  total: 3358, // $33.58
  
  // Order status
  status: 'processing',
  
  // Prescription fields
  prescription_required: true,
  prescription_verified: false,
  prescription_notes: 'Prescription uploaded by customer. Awaiting pharmacist verification.',
  
  // Payment
  paymentStatus: 'pending',
  
  // Metadata
  notes: 'Customer uploaded prescription image. Requires pharmacist review before processing.',
})

// Mixed Order (Both OTC and prescription items)
export const mixedOrder: (
  args: OrderArgs,
) => RequiredDataFromCollectionSlug<'orders'> = ({ 
  customer, 
  admin,
  shippingAddress, 
  billingAddress, 
  products 
}) => ({
  customer: customer.id,
  shippingAddress: convertAddressForOrder(shippingAddress),
  billingAddress: billingAddress ? convertAddressForOrder(billingAddress) : convertAddressForOrder(shippingAddress),
  
  // Order items
  items: [
    ...(products.amoxicillin ? [{
      product: products.amoxicillin.id,
      quantity: 1,
      price: 1299, // $12.99 per item
    }] : []),
    ...(products.paracetamol ? [{
      product: products.paracetamol.id,
      quantity: 3,
      price: 599, // $5.99 per item
    }] : []),
    ...(products.vitaminC ? [{
      product: products.vitaminC.id,
      quantity: 2,
      price: 899, // $8.99 per item
    }] : []),
    ...(products.ibuprofen ? [{
      product: products.ibuprofen.id,
      quantity: 1,
      price: 699, // $6.99 per item
    }] : []),
  ],
  
  // Pricing
  subtotal: 5693, // $56.93
  tax: 569, // 10% tax
  shipping: 0, // Free shipping over $50
  total: 6262, // $62.62
  
  // Order status
  status: 'completed',
  
  // Prescription fields
  prescription_required: true,
  prescription_verified: true,
  verified_by: admin?.id,
  prescription_notes: 'Mixed order: Amoxicillin requires prescription (verified). Other items are OTC.',
  
  // Payment
  paymentStatus: 'paid',
  
  // Metadata
  notes: 'Large order with both prescription and OTC medications. Free shipping applied.',
})

// Cancelled Order
export const cancelledOrder: (
  args: OrderArgs,
) => RequiredDataFromCollectionSlug<'orders'> = ({ 
  customer, 
  shippingAddress, 
  billingAddress, 
  products 
}) => ({
  customer: customer.id,
  shippingAddress: convertAddressForOrder(shippingAddress),
  billingAddress: billingAddress ? convertAddressForOrder(billingAddress) : convertAddressForOrder(shippingAddress),
  
  // Order items
  items: [
    ...(products.coughSyrup ? [{
      product: products.coughSyrup.id,
      quantity: 2,
      price: 749, // $7.49 per item
    }] : []),
    ...(products.ibuprofen ? [{
      product: products.ibuprofen.id,
      quantity: 1,
      price: 699, // $6.99 per item
    }] : []),
  ],
  
  // Pricing
  subtotal: 2147, // $21.47
  tax: 215, // 10% tax
  shipping: 500, // $5.00 shipping
  total: 2862, // $28.62
  
  // Order status
  status: 'cancelled',
  
  // Prescription fields
  prescription_required: false,
  prescription_verified: false,
  
  // Payment
  paymentStatus: 'refunded',
  
  // Metadata
  notes: 'Order cancelled by customer. Stock quantities restored to inventory.',
})

// Delivered Order (Historical)
export const deliveredOrder: (
  args: OrderArgs,
) => RequiredDataFromCollectionSlug<'orders'> = ({ 
  customer, 
  shippingAddress, 
  billingAddress, 
  products 
}) => ({
  customer: customer.id,
  shippingAddress: convertAddressForOrder(shippingAddress),
  billingAddress: billingAddress ? convertAddressForOrder(billingAddress) : convertAddressForOrder(shippingAddress),
  
  // Order items
  items: [
    ...(products.vitaminC ? [{
      product: products.vitaminC.id,
      quantity: 3,
      price: 899, // $8.99 per item
    }] : []),
    ...(products.paracetamol ? [{
      product: products.paracetamol.id,
      quantity: 2,
      price: 599, // $5.99 per item
    }] : []),
  ],
  
  // Pricing
  subtotal: 3895, // $38.95
  tax: 390, // 10% tax
  shipping: 0, // Free shipping
  total: 4285, // $42.85
  
  // Order status
  status: 'completed',
  
  // Prescription fields
  prescription_required: false,
  prescription_verified: false,
  
  // Payment
  paymentStatus: 'paid',
  
  // Metadata
  notes: 'Regular customer order. Successfully delivered to home address.',
})