/**
 * Midtrans Payment Adapter for Payload E-commerce Plugin
 * 
 * Custom payment adapter implementing Midtrans Snap API integration.
 * Follows the PaymentAdapter interface from @payloadcms/plugin-ecommerce.
 */

import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'
import type { Endpoint, GroupField } from 'payload'
import { createMidtransClient } from './client'
import type {
    MidtransAdapterConfig,
    MidtransItemDetail,
    MidtransNotification,
    MidtransSnapParams,
} from './types'
import { isFailedTransaction, isSuccessfulTransaction } from './types'

/**
 * Create Midtrans payment adapter for Payload e-commerce plugin
 * 
 * @param config - Midtrans configuration
 * @returns PaymentAdapter object compatible with @payloadcms/plugin-ecommerce
 */
export function midtransAdapter(config: MidtransAdapterConfig): PaymentAdapter {
    const { serverKey, clientKey, isProduction = false, label = 'Midtrans' } = config

    // Validate required config
    if (!serverKey) {
        throw new Error('Midtrans adapter requires serverKey')
    }
    if (!clientKey) {
        throw new Error('Midtrans adapter requires clientKey')
    }

    // Create client instance
    const client = createMidtransClient({ serverKey, clientKey, isProduction })

    /**
     * Midtrans-specific group field for transactions
     */
    const group: GroupField = {
        name: 'midtrans',
        type: 'group',
        admin: {
            condition: (data) => data?.paymentMethod === 'midtrans',
        },
        fields: [
            {
                name: 'orderId',
                type: 'text',
                label: 'Midtrans Order ID',
                admin: {
                    readOnly: true,
                },
            },
            {
                name: 'transactionId',
                type: 'text',
                label: 'Midtrans Transaction ID',
                admin: {
                    readOnly: true,
                },
            },
            {
                name: 'snapToken',
                type: 'text',
                label: 'Snap Token',
                admin: {
                    readOnly: true,
                },
            },
            {
                name: 'redirectUrl',
                type: 'text',
                label: 'Redirect URL',
                admin: {
                    readOnly: true,
                },
            },
            {
                name: 'paymentType',
                type: 'text',
                label: 'Payment Type',
                admin: {
                    readOnly: true,
                },
            },
            {
                name: 'transactionStatus',
                type: 'text',
                label: 'Transaction Status',
                admin: {
                    readOnly: true,
                },
            },
            {
                name: 'response',
                type: 'json',
                label: 'Full Response',
                admin: {
                    readOnly: true,
                },
            },
        ],
    }

    /**
     * Webhook endpoint for Midtrans notifications
     */
    const webhookEndpoint: Endpoint = {
        path: '/webhook',
        method: 'post',
        handler: async (req) => {
            try {
                const body = await req.json?.() ?? {}

                req.payload.logger.info(`[Midtrans] Webhook received: order_id=${body.order_id}, status=${body.transaction_status}, payment_type=${body.payment_type}`)

                // Verify and parse notification
                const notification = await client.handleNotification(body) as MidtransNotification

                // Verify signature
                if (!client.verifySignature(notification)) {
                    req.payload.logger.error('[Midtrans] Invalid webhook signature')
                    return Response.json(
                        { error: 'Invalid signature' },
                        { status: 401 }
                    )
                }

                const {
                    order_id: midtransOrderId,
                    transaction_id,
                    transaction_status,
                    payment_type,
                } = notification

                // Extract transaction ID from Midtrans order ID
                // Format: TXN-{transactionId}-{timestamp}
                const txnIdMatch = midtransOrderId.match(/^TXN-(.+)-\d+$/)
                if (!txnIdMatch) {
                    console.warn('[Midtrans] Unexpected order ID format:', midtransOrderId)
                }

                // Determine new status
                let status: 'pending' | 'succeeded' | 'failed' = 'pending'
                if (isSuccessfulTransaction(transaction_status)) {
                    status = 'succeeded'
                } else if (isFailedTransaction(transaction_status)) {
                    status = 'failed'
                }

                // Update transaction in database
                if (txnIdMatch?.[1]) {
                    const transactionId = txnIdMatch[1]
                    try {
                        await req.payload.update({
                            collection: 'transactions',
                            id: transactionId,
                            data: {
                                status,
                                midtrans: {
                                    transactionId: transaction_id,
                                    paymentType: payment_type,
                                    transactionStatus: transaction_status,
                                    response: notification,
                                },
                            },
                        })
                        req.payload.logger.info(`[Midtrans] Transaction updated: ${transactionId}, status=${status}`)
                    } catch (updateError) {
                        req.payload.logger.error(`[Midtrans] Failed to update transaction: ${updateError}`)
                    }
                }

                return Response.json({ success: true, status })
            } catch (error) {
                req.payload.logger.error(`[Midtrans] Webhook error: ${error}`)
                return Response.json(
                    { error: 'Internal server error' },
                    { status: 500 }
                )
            }
        },
    }

    return {
        /**
         * Unique name identifier for this payment method
         */
        name: 'midtrans',

        /**
         * Human-readable label
         */
        label,

        /**
         * Group field configuration for transactions
         */
        group,

        /**
         * Custom endpoints for this payment method
         */
        endpoints: [webhookEndpoint],

        /**
         * Initiate payment - creates Snap token for checkout
         */
        initiatePayment: async ({ data, req, transactionsSlug }) => {
            const { cart, currency, customerEmail, billingAddress, shippingAddress } = data

            // Generate unique order ID for Midtrans based on timestamp
            // We'll store the transaction ID after creating it in Payload
            const timestamp = Date.now()

            // Build item details from cart
            const itemDetails: MidtransItemDetail[] = cart.items?.map((item) => {
                const product = typeof item.product === 'object' ? item.product : null
                return {
                    id: String(typeof item.product === 'object' ? item.product?.id : item.product),
                    name: (product as any)?.title || (product as any)?.name || 'Product',
                    price: Math.round((product as any)?.price || 0),
                    quantity: item.quantity || 1,
                }
            }) || []

            // Calculate total from cart
            const grossAmount = cart.subtotal || itemDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0)

            // Create transaction record in Payload first
            const transaction = await req.payload.create({
                collection: transactionsSlug as 'transactions',
                data: {
                    customer: cart.customer,
                    paymentMethod: 'midtrans',
                    status: 'pending',
                    items: cart.items,
                    currency,
                    total: grossAmount,
                    billingAddress,
                    shippingAddress,
                },
            })

            // Midtrans order ID includes Payload transaction ID for webhook correlation
            const midtransOrderId = `TXN-${transaction.id}-${timestamp}`

            // Build customer details
            const customerDetails = {
                first_name: (billingAddress as any)?.firstName || '',
                last_name: (billingAddress as any)?.lastName || '',
                email: customerEmail || '',
                phone: (billingAddress as any)?.phone || '',
            }

            // Build Snap parameters
            const snapParams: MidtransSnapParams = {
                transaction_details: {
                    order_id: midtransOrderId,
                    gross_amount: Math.round(grossAmount),
                },
                item_details: itemDetails.length > 0 ? itemDetails : undefined,
                customer_details: customerDetails,
                callbacks: {
                    finish: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/checkout/success?transaction_id=${transaction.id}`,
                    error: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/checkout/error?transaction_id=${transaction.id}`,
                    pending: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/checkout/pending?transaction_id=${transaction.id}`,
                },
                credit_card: {
                    secure: true,
                },
            }

            try {
                // Create Snap transaction
                const snapResponse = await client.createTransaction(snapParams)

                // Update transaction with Midtrans data
                await req.payload.update({
                    collection: transactionsSlug as 'transactions',
                    id: transaction.id,
                    data: {
                        midtrans: {
                            orderId: midtransOrderId,
                            snapToken: snapResponse.token,
                            redirectUrl: snapResponse.redirect_url,
                        },
                    },
                })

                req.payload.logger.info(`[Midtrans] Payment initiated for transaction ${transaction.id}: orderId=${midtransOrderId}, hasToken=${!!snapResponse.token}`)

                return {
                    message: 'Payment initiated successfully',
                    transactionId: transaction.id,
                    snapToken: snapResponse.token,
                    redirectUrl: snapResponse.redirect_url,
                    midtransOrderId,
                    clientKey, // For frontend Snap.js
                    isProduction, // For frontend Snap.js URL
                }
            } catch (error) {
                req.payload.logger.error(`[Midtrans] Payment initiation error: ${error}`)

                // Delete the pending transaction
                await req.payload.delete({
                    collection: transactionsSlug as 'transactions',
                    id: transaction.id,
                })

                throw new Error(`Failed to initiate Midtrans payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        },

        /**
         * Confirm order - creates order after successful payment
         */
        confirmOrder: async ({ data, ordersSlug, req, transactionsSlug, cartsSlug, customersSlug }) => {
            const { customerEmail, ...additionalData } = data

            // Get transaction ID from data (passed from frontend after Snap callback)
            const transactionId = additionalData.transactionId as string
            if (!transactionId) {
                throw new Error('Transaction ID is required to confirm order')
            }

            // Fetch the transaction
            const transaction = await req.payload.findByID({
                collection: (transactionsSlug || 'transactions') as 'transactions',
                id: transactionId,
                depth: 2,
            })

            if (!transaction) {
                throw new Error('Transaction not found')
            }

            // Verify payment status with Midtrans
            const midtransData = (transaction as any).midtrans
            if (midtransData?.orderId) {
                try {
                    const status = await client.getTransactionStatus(midtransData.orderId)

                    if (!isSuccessfulTransaction(status.transaction_status)) {
                        throw new Error(`Payment not successful. Status: ${status.transaction_status}`)
                    }

                    // Update transaction with latest status
                    await req.payload.update({
                        collection: (transactionsSlug || 'transactions') as 'transactions',
                        id: transactionId,
                        data: {
                            status: 'succeeded',
                            midtrans: {
                                ...midtransData,
                                transactionId: status.transaction_id,
                                paymentType: status.payment_type,
                                transactionStatus: status.transaction_status,
                                response: status,
                            },
                        },
                    })
                } catch (statusError) {
                    console.error('[Midtrans] Failed to verify payment status:', statusError)
                    throw new Error('Failed to verify payment status with Midtrans')
                }
            }

            // Create the order
            const order = await req.payload.create({
                collection: (ordersSlug || 'orders') as 'orders',
                data: {
                    customer: transaction.customer,
                    items: transaction.items,
                    total: transaction.total,
                    currency: transaction.currency,
                    billingAddress: transaction.billingAddress,
                    shippingAddress: transaction.shippingAddress,
                    status: 'pending',
                    transactions: [transactionId],
                },
            })

            // Clear the customer's cart if cart exists
            const customerId = typeof transaction.customer === 'object'
                ? (transaction.customer as any)?.id
                : transaction.customer

            if (customerId && cartsSlug) {
                try {
                    const carts = await req.payload.find({
                        collection: cartsSlug as 'carts',
                        where: {
                            customer: { equals: customerId },
                        },
                        limit: 1,
                    })

                    if (carts.docs.length > 0) {
                        await req.payload.update({
                            collection: cartsSlug as 'carts',
                            id: carts.docs[0].id,
                            data: {
                                items: [],
                                subtotal: 0,
                            },
                        })
                    }
                } catch (cartError) {
                    console.warn('[Midtrans] Failed to clear cart:', cartError)
                }
            }

            req.payload.logger.info(`[Midtrans] Order confirmed: orderId=${order.id}, transactionId=${transactionId}`)

            return {
                message: 'Order confirmed successfully',
                orderID: order.id,
                transactionID: transactionId,
            }
        },
    }
}

// Export types for external use
export type { MidtransAdapterConfig, MidtransNotification } from './types'

