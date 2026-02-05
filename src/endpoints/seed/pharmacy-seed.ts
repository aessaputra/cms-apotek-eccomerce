import type { Payload, PayloadRequest } from 'payload'

// Import pharmacy-specific seed data
import {
  antibioticsCategoryData,
  coldFluCategoryData,
  firstAidCategoryData,
  painReliefCategoryData,
  vitaminsCategoryData
} from './pharmacy-categories'

import {
  productAmoxicillin,
  productCoughSyrup,
  productIbuprofen,
  productParacetamol,
  productVitaminC,
} from './pharmacy-products'

// Removed batch imports

import {
  customerBillingAddress,
  customerHomeAddress,
  customerOfficeAddress,
  customerParentAddress
} from './pharmacy-addresses'

import {
  otcOrder,
  prescriptionOrder
} from './pharmacy-orders'

export const seedPharmacyData = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding pharmacy-specific data...')

  // Create admin user for prescription verification
  payload.logger.info('— Creating admin user...')
  const adminUser = await payload.create({
    collection: 'users',
    data: {
      name: 'Dr. Sarah Admin',
      email: 'admin@pharmacy.com',
      password: 'admin123',
      phone: '+62-811-9999-0000',
      roles: ['admin'],
    },
  })

  // Create customer user
  payload.logger.info('— Creating customer user...')
  const customerUser = await payload.create({
    collection: 'users',
    data: {
      name: 'John Doe',
      email: 'customer@pharmacy.com',
      password: 'customer123',
      phone: '+62-812-3456-7890',
      roles: ['customer'],
    },
  })

  // Create pharmacy categories
  payload.logger.info('— Creating pharmacy categories...')
  const [
    painReliefCategory,
    antibioticsCategory,
    vitaminsCategory,
    coldFluCategory,
    firstAidCategory,
  ] = await Promise.all([
    payload.create({ collection: 'categories', data: painReliefCategoryData }),
    payload.create({ collection: 'categories', data: antibioticsCategoryData }),
    payload.create({ collection: 'categories', data: vitaminsCategoryData }),
    payload.create({ collection: 'categories', data: coldFluCategoryData }),
    payload.create({ collection: 'categories', data: firstAidCategoryData }),
  ])

  // Create pharmacy products
  payload.logger.info('— Creating pharmacy products...')
  const [
    paracetamolProduct,
    amoxicillinProduct,
    vitaminCProduct,
    coughSyrupProduct,
    ibuprofenProduct,
  ] = await Promise.all([
    payload.create({
      collection: 'products',
      data: productParacetamol({ category: painReliefCategory }),
    }),
    payload.create({
      collection: 'products',
      data: productAmoxicillin({ category: antibioticsCategory }),
    }),
    payload.create({
      collection: 'products',
      data: productVitaminC({ category: vitaminsCategory }),
    }),
    payload.create({
      collection: 'products',
      data: productCoughSyrup({ category: coldFluCategory }),
    }),
    payload.create({
      collection: 'products',
      data: productIbuprofen({ category: painReliefCategory }),
    }),
  ])

  // Create inventory records (1 per product)
  payload.logger.info('— Creating inventory records...')
  await Promise.all([
    // Paracetamol inventory
    payload.create({
      collection: 'inventory',
      data: {
        product: paracetamolProduct.id,
        quantity: 1000,
        low_stock_threshold: 100,
      },
    }),

    // Amoxicillin inventory (Low Stock)
    payload.create({
      collection: 'inventory',
      data: {
        product: amoxicillinProduct.id,
        quantity: 20,
        low_stock_threshold: 50,
      },
    }),

    // Vitamin C inventory 
    payload.create({
      collection: 'inventory',
      data: {
        product: vitaminCProduct.id,
        quantity: 500,
        low_stock_threshold: 50,
      },
    }),

    // Cough syrup inventory
    payload.create({
      collection: 'inventory',
      data: {
        product: coughSyrupProduct.id,
        quantity: 200,
        low_stock_threshold: 20,
      },
    }),

    // Ibuprofen inventory
    payload.create({
      collection: 'inventory',
      data: {
        product: ibuprofenProduct.id,
        quantity: 300,
        low_stock_threshold: 30,
      },
    }),
  ])

  // Create customer addresses
  payload.logger.info('— Creating customer addresses...')
  const [
    homeAddress,
    officeAddress,
    parentAddress,
    billingAddress,
  ] = await Promise.all([
    payload.create({
      collection: 'addresses',
      data: customerHomeAddress({ customer: customerUser }),
    }),
    payload.create({
      collection: 'addresses',
      data: customerOfficeAddress({ customer: customerUser }),
    }),
    payload.create({
      collection: 'addresses',
      data: customerParentAddress({ customer: customerUser }),
    }),
    payload.create({
      collection: 'addresses',
      data: customerBillingAddress({ customer: customerUser }),
    }),
  ])

  // Create some orders
  payload.logger.info('— Creating sample orders...')
  const products = {
    paracetamol: paracetamolProduct,
    amoxicillin: amoxicillinProduct,
    vitaminC: vitaminCProduct,
    coughSyrup: coughSyrupProduct,
    ibuprofen: ibuprofenProduct,
  }

  // Create orders (simplified, no movement audit creation)
  await Promise.all([
    payload.create({
      collection: 'orders',
      data: otcOrder({
        customer: customerUser,
        shippingAddress: homeAddress,
        billingAddress: billingAddress,
        products,
      }),
    }),

    payload.create({
      collection: 'orders',
      data: prescriptionOrder({
        customer: customerUser,
        admin: adminUser,
        shippingAddress: officeAddress,
        billingAddress: billingAddress,
        products,
      }),
    }),
  ])

  payload.logger.info('Pharmacy data seeded successfully!')
}