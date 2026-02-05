import type { User } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

type AddressArgs = {
  customer: User
}

// Customer Home Address
export const customerHomeAddress: (
  args: AddressArgs,
) => RequiredDataFromCollectionSlug<'addresses'> = ({ customer }) => ({
  customer: customer.id,
  label: 'Home',
  title: 'mr',
  firstName: 'John',
  lastName: 'Doe',
  company: '',
  phone: '+62-812-3456-7890',
  addressLine1: 'Jl. Sudirman No. 123',
  addressLine2: 'Apartment Block A, Unit 15',
  city: 'Jakarta',
  state: 'DKI Jakarta',
  country: 'MY',
  addressType: 'both',
  isDefaultShipping: true,
  isDefaultBilling: true,
  deliveryInstructions: 'Please ring the doorbell twice. Leave packages with security if no answer.',
  isActive: true,
})

// Customer Office Address
export const customerOfficeAddress: (
  args: AddressArgs,
) => RequiredDataFromCollectionSlug<'addresses'> = ({ customer }) => ({
  customer: customer.id,
  label: 'Office',
  title: 'mr',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Tech Solutions Malaysia',
  phone: '+62-21-5555-1234',
  addressLine1: 'Jl. Thamrin No. 456',
  addressLine2: 'Office Tower, 15th Floor',
  city: 'Jakarta',
  state: 'DKI Jakarta',
  country: 'MY',
  addressType: 'shipping',
  isDefaultShipping: false,
  isDefaultBilling: false,
  deliveryInstructions: 'Deliver to reception desk. Office hours: 9 AM - 6 PM, Monday to Friday.',
  isActive: true,
})

// Customer Parent's Address
export const customerParentAddress: (
  args: AddressArgs,
) => RequiredDataFromCollectionSlug<'addresses'> = ({ customer }) => ({
  customer: customer.id,
  label: "Mom's House",
  title: 'mrs',
  firstName: 'Maria',
  lastName: 'Doe',
  company: '',
  phone: '+62-21-7777-8888',
  addressLine1: 'Jl. Kemang Raya No. 789',
  addressLine2: '',
  city: 'Jakarta Selatan',
  state: 'DKI Jakarta',
  country: 'MY',
  addressType: 'shipping',
  isDefaultShipping: false,
  isDefaultBilling: false,
  deliveryInstructions: 'Please call before delivery. Gate code: 1234.',
  isActive: true,
})

// Alternative Billing Address
export const customerBillingAddress: (
  args: AddressArgs,
) => RequiredDataFromCollectionSlug<'addresses'> = ({ customer }) => ({
  customer: customer.id,
  label: 'Billing Address',
  title: 'mr',
  firstName: 'John',
  lastName: 'Doe',
  company: '',
  phone: '+62-812-3456-7890',
  addressLine1: 'Jl. Gatot Subroto No. 321',
  addressLine2: 'Komplek Perumahan Indah, Blok C No. 7',
  city: 'Jakarta',
  state: 'DKI Jakarta',
  country: 'MY',
  addressType: 'billing',
  isDefaultShipping: false,
  isDefaultBilling: false,
  deliveryInstructions: '',
  isActive: true,
})

// Admin User Address
export const adminHomeAddress: (
  args: AddressArgs,
) => RequiredDataFromCollectionSlug<'addresses'> = ({ customer }) => ({
  customer: customer.id,
  label: 'Admin Home',
  title: 'dr',
  firstName: 'Sarah',
  lastName: 'Admin',
  company: '',
  phone: '+62-811-9999-0000',
  addressLine1: 'Jl. Menteng No. 100',
  addressLine2: 'Luxury Residence, Tower 2, Unit 2501',
  city: 'Jakarta',
  state: 'DKI Jakarta',
  country: 'MY',
  addressType: 'both',
  isDefaultShipping: true,
  isDefaultBilling: true,
  deliveryInstructions: 'Concierge service available 24/7. Please coordinate with building management.',
  isActive: true,
})

// Test address for different city
export const customerSecondaryCityAddress: (
  args: AddressArgs,
) => RequiredDataFromCollectionSlug<'addresses'> = ({ customer }) => ({
  customer: customer.id,
  label: 'Bandung Office',
  title: 'mr',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Branch Office Bandung',
  phone: '+62-22-1234-5678',
  addressLine1: 'Jl. Asia Afrika No. 50',
  addressLine2: 'Business Center, 8th Floor',
  city: 'Bandung',
  state: 'Jawa Barat',
  country: 'MY',
  addressType: 'shipping',
  isDefaultShipping: false,
  isDefaultBilling: false,
  deliveryInstructions: 'Business hours only. Contact Mr. Budi at extension 801.',
  isActive: true,
})