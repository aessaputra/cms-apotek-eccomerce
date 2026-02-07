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
    // Payload CMS auth columns
    resetPasswordToken: varchar('reset_password_token', { length: 255 }),
    resetPasswordExpiration: timestamp('reset_password_expiration', { withTimezone: true }),
    salt: varchar('salt', { length: 255 }),
    hash: varchar('hash', { length: 255 }),
    loginAttempts: integer('login_attempts').default(0),
    lockUntil: timestamp('lock_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Customer shipping addresses
 */
export const addresses = pgTable('addresses', {
    id: uuid('id').primaryKey(),
    user_id: uuid('user_id').notNull(), // Match Payload Where path
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

/**
 * Admins - Staff only, for Payload Admin Panel login
 * Customers use profiles (Users collection); never login to Admin Panel
 */
export const admins = pgTable('admins', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: text('full_name'),
    phone: varchar('phone', { length: 50 }),
    role: varchar('role', { length: 20 }).default('admin'),
    salt: text('salt'),
    hash: text('hash'),
    resetPasswordToken: varchar('reset_password_token', { length: 255 }),
    resetPasswordExpiration: timestamp('reset_password_expiration', { withTimezone: true }),
    loginAttempts: integer('login_attempts').default(0),
    lockUntil: timestamp('lock_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Admin sessions - Payload admin panel sessions
 */
export const adminsSessions = pgTable('admins_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('_parent_id').references(() => admins.id, { onDelete: 'cascade' }),
    order: integer('_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/**
 * Payload CMS Sessions (legacy - profiles when Users had auth)
 */
export const profilesSessions = pgTable('profiles_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('_parent_id').references(() => profiles.id, { onDelete: 'cascade' }),
    order: integer('_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
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
    logoId: integer('logo_id'),
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
    mediaId: integer('media_id'),
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
    user_id: uuid('user_id'), // orderedBy dbName - match Payload Where path
    customerId: uuid('customer_id'), // Payload ecommerce plugin compatibility
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
 * Order line items - Payload array structure (_parent_id, _order, id as text)
 */
export const orderItems = pgTable('order_items', {
    id: text('id').primaryKey(),
    parentId: uuid('_parent_id').references(() => orders.id, { onDelete: 'cascade' }),
    order: integer('_order').notNull().default(0),
    productId: uuid('product_id'),
    price: numeric('price', { precision: 12, scale: 2 }),
    quantity: integer('quantity').default(1),
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
    id: uuid('id').primaryKey().defaultRandom(),
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

/**
 * Payment items - Array field for transactions (product, variant, quantity)
 */
export const paymentsItems = pgTable('payments_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('_parent_id').references(() => payments.id, { onDelete: 'cascade' }),
    order: integer('_order').notNull().default(0),
    productId: uuid('product_id'),
    variantId: uuid('variant_id'),
    quantity: integer('quantity').default(1),
})

// ============================================================================
// EXPORT HOOK FOR PAYLOAD
// ============================================================================

/**
 * Hook function to add Supabase tables to Payload's schema.
 * Use this in postgresAdapter({ beforeSchemaInit: [supabaseSchemaHook] })
 *
 * IMPORTANT: Use keys that match Payload's tableNameMap (from createTableName).
 * Payload maps collection slug (snake_case) -> table key. E.g. "product-images" -> "product_images".
 * Using wrong keys causes "Cannot read properties of undefined (reading 'id')" in buildQuery.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseSchemaHook = ({ schema }: { schema: any; adapter: any }) => {
    return {
        ...schema,
        tables: {
            ...schema.tables,
            // Keys must match tableNameMap lookup (snake_case of slug/dbName)
            profiles,
            addresses,
            categories,
            products,
            product_images: productImages,
            inventory,
            orders,
            order_items: orderItems,
            cart_items: cartItems,
            payments,
            payments_items: paymentsItems,
            profiles_sessions: profilesSessions,
            admins,
            admins_sessions: adminsSessions,
        },
    }
}
