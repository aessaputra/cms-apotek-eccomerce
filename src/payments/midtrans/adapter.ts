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
    // Group field removed to use flat fields defined in Transactions collection override

    /**
     * Group field configuration (virtual, not stored in DB)
     * Required by PaymentAdapter interface
     */
    const group: GroupField = {
        name: 'midtrans_meta',
        type: 'group',
        virtual: true,
        fields: [],
        admin: {
            hidden: true,
        },
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
                    req.payload.logger.warn(`[Midtrans] Unexpected order ID format: ${midtransOrderId}`)
                }

                // Determine new status
                let status: 'pending' | 'settlement' | 'failure' = 'pending'
                if (isSuccessfulTransaction(transaction_status)) {
                    status = 'settlement'
                } else if (isFailedTransaction(transaction_status)) {
                    status = 'failure'
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
                                midtrans_transaction_id: transaction_id,
                                midtrans_payment_type: payment_type,
                                // Cast to satisfy Record<string, unknown> constraint of generic JSON type
                                midtrans_response: notification as unknown as Record<string, unknown>,
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
         * Group field configuration
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
            const { cart, currency, customerEmail, billingAddress } = data

            // Generate unique order ID for Midtrans based on timestamp
            // We'll store the transaction ID after creating it in Payload
            const timestamp = Date.now()

            // Build item details from cart
            const itemDetails: MidtransItemDetail[] = cart.items?.map((item) => {
                const product = typeof item.product === 'object' ? item.product : null
                const productData = product as { title?: string, name?: string, price?: number } | null
                const title = productData?.title || productData?.name || 'Product'
                const price = Math.round(productData?.price || 0)

                return {
                    id: String(typeof item.product === 'object' ? item.product?.id : item.product),
                    name: title,
                    price,
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
                    currency: currency as 'USD',
                    amount: grossAmount,
                    billingAddress,
                    // valid Transaction does not have shippingAddress in types
                },
            })

            // Midtrans order ID includes Payload transaction ID for webhook correlation
            const midtransOrderId = `TXN-${transaction.id}-${timestamp}`

            // Build customer details
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const billing = billingAddress as any
            const customerDetails = {
                first_name: billing?.firstName || '',
                last_name: billing?.lastName || '',
                email: customerEmail || '',
                phone: billing?.phone || '',
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
                // Update transaction with Midtrans data
                await req.payload.update({
                    collection: transactionsSlug as 'transactions',
                    id: transaction.id,
                    data: {
                        midtrans_order_id: midtransOrderId,
                        midtrans_response: {
                            snap_token: snapResponse.token,
                            redirect_url: snapResponse.redirect_url,
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
        confirmOrder: async ({ data, ordersSlug, req, transactionsSlug, cartsSlug, customersSlug: _customersSlug }) => {
            const { customerEmail: _customerEmail, ...additionalData } = data

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
            const midtransOrderId = transaction.midtrans_order_id
            if (midtransOrderId) {
                try {
                    const status = await client.getTransactionStatus(midtransOrderId)

                    if (!isSuccessfulTransaction(status.transaction_status)) {
                        throw new Error(`Payment not successful. Status: ${status.transaction_status}`)
                    }

                    // Update transaction with latest status
                    // Update transaction with latest status
                    await req.payload.update({
                        collection: (transactionsSlug || 'transactions') as 'transactions',
                        id: transactionId,
                        data: {
                            status: 'settlement',
                            midtrans_transaction_id: status.transaction_id,
                            midtrans_payment_type: status.payment_type,
                            midtrans_response: status as unknown as Record<string, unknown>,
                        },
                    })
                } catch (statusError) {
                    req.payload.logger.error(`[Midtrans] Failed to verify payment status: ${statusError}`)
                    throw new Error('Failed to verify payment status with Midtrans')
                }
            }

            const billing = transaction.billingAddress
            const shippingName = billing ? `${billing.firstName || ''} ${billing.lastName || ''}`.trim() : 'Unknown'
            const shippingAddress = billing ? `${billing.addressLine1 || ''} ${billing.city || ''} ${billing.postalCode || ''}`.trim() : 'Unknown'
            const shippingPhone = billing?.phone || ''

            const customerId = typeof transaction.customer === 'object' ? transaction.customer?.id : transaction.customer

            // Create the order
            const order = await req.payload.create({
                collection: (ordersSlug || 'orders') as 'orders',
                data: {
                    orderedBy: customerId || '',
                    items: transaction.items?.map(item => {
                        const productId = typeof item.product === 'object' ? item.product?.id : item.product
                        return {
                            product: productId as string,
                            price: 0,
                            quantity: item.quantity,
                        }
                    }) || [],
                    total: transaction.amount || 0,
                    shipping_name: shippingName || 'Customer',
                    shipping_address: shippingAddress || 'Address not provided',
                    shipping_phone: shippingPhone || '0000000000',
                    status: 'processing',
                },
            })

            // Clear the customer's cart if cart exists
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
                    req.payload.logger.warn(`[Midtrans] Failed to clear cart: ${cartError}`)
                }
            }

            req.payload.logger.info(`[Midtrans] Order confirmed: orderId=${order.id}, transactionId=${transactionId}`)

            return {
                message: 'Order confirmed',
                orderID: String(order.id),
                transactionID: String(transactionId)
            }
        },
    }
}

// Export types for external use
export type { MidtransAdapterConfig, MidtransNotification } from './types'

