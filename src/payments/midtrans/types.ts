/**
 * Midtrans Payment Adapter Types
 * 
 * TypeScript type definitions for Midtrans Snap API integration.
 */

/**
 * Midtrans adapter configuration
 */
export interface MidtransAdapterConfig {
    /** Midtrans Server Key - used for server-side API calls */
    serverKey: string
    /** Midtrans Client Key - used for Snap.js on frontend */
    clientKey: string
    /** Set to true for production environment */
    isProduction?: boolean
    /** Custom label for the payment method */
    label?: string
}

/**
 * Transaction details for Snap token creation
 */
export interface MidtransTransactionDetails {
    order_id: string
    gross_amount: number
}

/**
 * Item details for transaction
 */
export interface MidtransItemDetail {
    id: string
    name: string
    price: number
    quantity: number
    brand?: string
    category?: string
    merchant_name?: string
}

/**
 * Customer details for transaction
 */
export interface MidtransCustomerDetails {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    billing_address?: MidtransAddress
    shipping_address?: MidtransAddress
}

/**
 * Address structure for Midtrans
 */
export interface MidtransAddress {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postal_code?: string
    country_code?: string
}

/**
 * Snap transaction parameters
 */
export interface MidtransSnapParams {
    transaction_details: MidtransTransactionDetails
    item_details?: MidtransItemDetail[]
    customer_details?: MidtransCustomerDetails
    callbacks?: {
        finish?: string
        error?: string
        pending?: string
    }
    enabled_payments?: string[]
    credit_card?: {
        secure?: boolean
        save_card?: boolean
    }
    expiry?: {
        start_time?: string
        unit?: 'second' | 'minute' | 'hour' | 'day'
        duration?: number
    }
}

/**
 * Snap token response from Midtrans
 */
export interface MidtransSnapResponse {
    token: string
    redirect_url: string
}

/**
 * Transaction status values
 */
export type MidtransTransactionStatus =
    | 'capture'
    | 'settlement'
    | 'pending'
    | 'deny'
    | 'cancel'
    | 'expire'
    | 'failure'
    | 'refund'
    | 'partial_refund'
    | 'authorize'

/**
 * Fraud status values
 */
export type MidtransFraudStatus = 'accept' | 'deny' | 'challenge'

/**
 * Webhook notification payload from Midtrans
 */
export interface MidtransNotification {
    transaction_time: string
    transaction_status: MidtransTransactionStatus
    transaction_id: string
    status_message: string
    status_code: string
    signature_key: string
    settlement_time?: string
    payment_type: string
    order_id: string
    merchant_id: string
    gross_amount: string
    fraud_status?: MidtransFraudStatus
    currency: string
    approval_code?: string
    // Bank transfer specific
    va_numbers?: Array<{
        va_number: string
        bank: string
    }>
    // E-wallet specific
    payment_code?: string
    store?: string
    // Card specific
    masked_card?: string
    card_type?: string
    bank?: string
}

/**
 * Payment status mapping for internal use
 */
export const MIDTRANS_STATUS_MAP: Record<MidtransTransactionStatus, string> = {
    capture: 'paid',
    settlement: 'paid',
    pending: 'pending',
    deny: 'failed',
    cancel: 'cancelled',
    expire: 'expired',
    failure: 'failed',
    refund: 'refunded',
    partial_refund: 'partially_refunded',
    authorize: 'authorized',
}

/**
 * Determine if transaction is considered successful
 */
export function isSuccessfulTransaction(status: MidtransTransactionStatus): boolean {
    return ['capture', 'settlement'].includes(status)
}

/**
 * Determine if transaction is pending
 */
export function isPendingTransaction(status: MidtransTransactionStatus): boolean {
    return ['pending', 'authorize'].includes(status)
}

/**
 * Determine if transaction failed or was cancelled
 */
export function isFailedTransaction(status: MidtransTransactionStatus): boolean {
    return ['deny', 'cancel', 'expire', 'failure'].includes(status)
}
