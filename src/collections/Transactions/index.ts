import { adminOnly } from '@/access/adminOnly'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import type { Field } from 'payload'

/**
 * Transactions collection - Strict schema match with Supabase 'payments' table.
 * DB columns: id, order_id, midtrans_*, amount, status, payment_method, paid_at,
 * expired_at, midtrans_response, created_at, updated_at
 *
 * Plugin default includes billing_address_*, customer_id, customer_email, cart_id, currency
 * which don't exist in Supabase. We define only fields that map to existing columns.
 */
const supabasePaymentsFields: Field[] = [
    {
        name: 'order',
        type: 'relationship',
        relationTo: 'orders',
        required: true,
        dbName: 'order_id',
        admin: {
            description: 'Order this payment belongs to',
            position: 'sidebar',
        },
    },
    {
        name: 'amount',
        type: 'number',
        required: true,
        admin: {
            description: 'Payment amount',
        },
    },
    {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'pending',
        dbName: 'status',
        options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Settlement', value: 'settlement' },
            { label: 'Capture', value: 'capture' },
            { label: 'Deny', value: 'deny' },
            { label: 'Cancel', value: 'cancel' },
            { label: 'Expire', value: 'expire' },
            { label: 'Failure', value: 'failure' },
        ],
        admin: {
            position: 'sidebar',
        },
    },
    {
        name: 'paymentMethod',
        type: 'text',
        dbName: 'payment_method',
        admin: {
            description: 'Payment method (e.g. midtrans)',
            position: 'sidebar',
        },
    },
    {
        name: 'items',
        type: 'array',
        dbName: 'payments_items',
        admin: {
            initCollapsed: true,
            description: 'Items in this payment',
        },
        fields: [
            {
                name: 'product',
                type: 'relationship',
                relationTo: 'products',
                required: true,
                dbName: 'product_id',
            },
            {
                name: 'variant',
                type: 'relationship',
                relationTo: 'variants',
                dbName: 'variant_id',
                admin: {
                    condition: () => false, // Hide if variants not used
                },
            },
            {
                name: 'quantity',
                type: 'number',
                required: true,
                defaultValue: 1,
                min: 1,
            },
        ],
    },
    {
        name: 'midtrans_order_id',
        type: 'text',
        admin: {
            readOnly: true,
            position: 'sidebar',
        },
    },
    {
        name: 'midtrans_transaction_id',
        type: 'text',
        admin: {
            readOnly: true,
            position: 'sidebar',
        },
    },
    {
        name: 'midtrans_payment_type',
        type: 'text',
        admin: {
            readOnly: true,
            position: 'sidebar',
        },
    },
    {
        name: 'paid_at',
        type: 'date',
        admin: {
            date: { pickerAppearance: 'dayAndTime' },
            readOnly: true,
            position: 'sidebar',
        },
    },
    {
        name: 'expired_at',
        type: 'date',
        admin: {
            date: { pickerAppearance: 'dayAndTime' },
            readOnly: true,
            position: 'sidebar',
        },
    },
    {
        name: 'midtrans_response',
        type: 'json',
        admin: {
            readOnly: true,
            position: 'sidebar',
        },
    },
]

/**
 * Transactions are created only by the payment flow (Midtrans initiate/webhook).
 * Midtrans adapter uses req.payload.create() without overrideAccess → bypasses access.
 * Admin Create is blocked for data integrity; admin can still read/update for reconciliation.
 */
const transactionsCreateAccess = () => false

export const TransactionsCollection: CollectionOverride = ({ defaultCollection }) => ({
    ...defaultCollection,
    dbName: 'payments',
    lockDocuments: false,
    admin: {
        ...defaultCollection.admin,
        group: 'Payments',
        useAsTitle: 'id',
        defaultColumns: ['id', 'order', 'amount', 'status', 'createdAt'],
        description: 'Transactions are created by the payment flow (Midtrans). Admin can read and update for reconciliation.',
    },
    access: {
        read: adminOnly,
        create: transactionsCreateAccess, // Block manual create; Midtrans uses Local API (bypasses)
        update: adminOnly, // Allow status updates for reconciliation
        delete: adminOnly,
    },
    fields: supabasePaymentsFields,
})
