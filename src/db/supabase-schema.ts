/**
 * Drizzle Schema for Existing Supabase Tables
 *
 * These tables are owned by Supabase and shared with the React Native app.
 * Payload CMS will NOT manage these schemas - they are defined here to prevent
 * Payload from attempting to recreate or modify them.
 *
 * @see https://payloadcms.com/docs/database/postgres#beforeSchemaInit
 */

import {
    boolean,
    integer,
    jsonb,
    numeric,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from '@payloadcms/db-postgres/drizzle/pg-core'

// ============================================================================
// USERS & AUTH
// ============================================================================

/**
 * User profiles - Extended from Supabase Auth
 */
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    phone: varchar('phone', { length: 20 }),
    role: varchar('role', { length: 20 }).default('customer'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Customer shipping addresses
 */
export const addresses = pgTable('addresses', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    label: varchar('label', { length: 50 }),
    recipientName: text('recipient_name').notNull(),
    phone: varchar('phone', { length: 20 }),
    addressLine: text('address_line').notNull(),
    city: varchar('city', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ============================================================================
// PRODUCTS & CATALOG
// ============================================================================

/**
 * Product categories
 */
export const categories = pgTable('categories', {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 255 }),
    logoUrl: text('logo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Products - Core product data
 */
export const products = pgTable('products', {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 255 }),
    description: text('description'),
    categoryId: uuid('category_id'),
    price: numeric('price', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Product images - Multiple images per product
 */
export const productImages = pgTable('product_images', {
    id: uuid('id').primaryKey(),
    productId: uuid('product_id').notNull(),
    imageUrl: text('image_url').notNull(),
    isPrimary: boolean('is_primary').default(false),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

/**
 * Inventory - Stock tracking
 */
export const inventory = pgTable('inventory', {
    id: uuid('id').primaryKey(),
    productId: uuid('product_id').notNull(),
    quantity: integer('quantity').default(0),
    lowStockThreshold: integer('low_stock_threshold').default(10),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ============================================================================
// ORDERS & TRANSACTIONS
// ============================================================================

/**
 * Customer orders
 */
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id'),
    addressId: uuid('address_id'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 30 }).default('pending'),
    shippingName: text('shipping_name'),
    shippingAddress: text('shipping_address'),
    shippingPhone: varchar('shipping_phone', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Order line items
 */
export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey(),
    orderId: uuid('order_id').notNull(),
    productId: uuid('product_id'),
    productName: text('product_name'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
    quantity: integer('quantity').default(1),
    totalPrice: numeric('total_price', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

/**
 * Shopping cart items
 */
export const cartItems = pgTable('cart_items', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    quantity: integer('quantity').default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Payment records - Midtrans integration
 */
export const payments = pgTable('payments', {
    id: uuid('id').primaryKey(),
    orderId: uuid('order_id').notNull(),
    midtransOrderId: varchar('midtrans_order_id', { length: 100 }),
    midtransTransactionId: varchar('midtrans_transaction_id', { length: 100 }),
    midtransPaymentType: varchar('midtrans_payment_type', { length: 50 }),
    amount: numeric('amount', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 30 }).default('pending'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    midtransResponse: jsonb('midtrans_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ============================================================================
// EXPORT HOOK FOR PAYLOAD
// ============================================================================

/**
 * Hook function to add Supabase tables to Payload's schema.
 * Use this in postgresAdapter({ beforeSchemaInit: [supabaseSchemaHook] })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseSchemaHook = ({ schema }: { schema: any; adapter: any }) => {
    return {
        ...schema,
        tables: {
            ...schema.tables,
            // Register all existing Supabase tables to prevent conflicts
            profiles,
            addresses,
            categories,
            products,
            productImages,
            inventory,
            orders,
            orderItems,
            cartItems,
            payments,
        },
    }
}
