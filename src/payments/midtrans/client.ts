/**
 * Midtrans API Client
 * 
 * Wrapper for midtrans-client library providing Snap API integration.
 */

import crypto from 'crypto'
import type {
    MidtransAdapterConfig,
    MidtransNotification,
    MidtransSnapParams,
    MidtransSnapResponse,
} from './types'

// Import midtrans-client (CommonJS module)
// @ts-expect-error - midtrans-client doesn't have TypeScript types
import midtransClient from 'midtrans-client'

/**
 * Midtrans client instance for Snap API
 */
export class MidtransClient {
    private snap: InstanceType<typeof midtransClient.Snap>
    private coreApi: InstanceType<typeof midtransClient.CoreApi>
    private serverKey: string

    constructor(config: MidtransAdapterConfig) {
        const { serverKey, clientKey, isProduction = false } = config

        this.serverKey = serverKey

        // Initialize Snap client
        this.snap = new midtransClient.Snap({
            isProduction,
            serverKey,
            clientKey,
        })

        // Initialize Core API client (for status checks and refunds)
        this.coreApi = new midtransClient.CoreApi({
            isProduction,
            serverKey,
            clientKey,
        })
    }

    /**
     * Create a Snap transaction token
     * 
     * @param params - Snap transaction parameters
     * @returns Promise with token and redirect URL
     */
    async createTransaction(params: MidtransSnapParams): Promise<MidtransSnapResponse> {
        try {
            const response = await this.snap.createTransaction(params)
            return {
                token: response.token,
                redirect_url: response.redirect_url,
            }
        } catch (error) {
            console.error('[Midtrans] Failed to create transaction:', error)
            throw new Error(`Midtrans transaction creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Get transaction status from Midtrans
     * 
     * @param orderId - Order ID to check
     * @returns Promise with transaction status notification
     */
    async getTransactionStatus(orderId: string): Promise<MidtransNotification> {
        try {
            const status = await this.coreApi.transaction.status(orderId)
            return status as MidtransNotification
        } catch (error) {
            console.error('[Midtrans] Failed to get transaction status:', error)
            throw new Error(`Midtrans status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Process webhook notification from Midtrans
     * 
     * @param notificationJson - JSON string or object from webhook
     * @returns Promise with verified notification data
     */
    async handleNotification(notificationJson: string | object): Promise<MidtransNotification> {
        try {
            const notification = await this.coreApi.transaction.notification(notificationJson)
            return notification as MidtransNotification
        } catch (error) {
            console.error('[Midtrans] Failed to handle notification:', error)
            throw new Error(`Midtrans notification handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Verify webhook signature
     * 
     * Signature formula: SHA512(order_id + status_code + gross_amount + serverKey)
     * 
     * @param notification - Notification payload
     * @returns boolean indicating if signature is valid
     */
    verifySignature(notification: MidtransNotification): boolean {
        const { order_id, status_code, gross_amount, signature_key } = notification

        const expectedSignature = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${this.serverKey}`)
            .digest('hex')

        return expectedSignature === signature_key
    }

    /**
     * Cancel a pending transaction
     * 
     * @param orderId - Order ID to cancel
     */
    async cancelTransaction(orderId: string): Promise<void> {
        try {
            await this.coreApi.transaction.cancel(orderId)
        } catch (error) {
            console.error('[Midtrans] Failed to cancel transaction:', error)
            throw new Error(`Midtrans cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Expire a pending transaction
     * 
     * @param orderId - Order ID to expire
     */
    async expireTransaction(orderId: string): Promise<void> {
        try {
            await this.coreApi.transaction.expire(orderId)
        } catch (error) {
            console.error('[Midtrans] Failed to expire transaction:', error)
            throw new Error(`Midtrans expiration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Refund a successful transaction
     * 
     * @param orderId - Order ID to refund
     * @param amount - Amount to refund (optional, full refund if not provided)
     * @param reason - Reason for refund
     */
    async refundTransaction(orderId: string, amount?: number, reason?: string): Promise<void> {
        try {
            const params: Record<string, unknown> = {}
            if (amount) params.refund_amount = amount
            if (reason) params.reason = reason

            await this.coreApi.transaction.refund(orderId, params)
        } catch (error) {
            console.error('[Midtrans] Failed to refund transaction:', error)
            throw new Error(`Midtrans refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}

/**
 * Create a new Midtrans client instance
 */
export function createMidtransClient(config: MidtransAdapterConfig): MidtransClient {
    return new MidtransClient(config)
}
