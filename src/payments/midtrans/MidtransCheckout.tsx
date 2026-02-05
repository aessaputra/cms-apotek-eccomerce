'use client'

/**
 * Midtrans Checkout Component
 * 
 * Client-side component for Midtrans Snap popup integration.
 * Loads Snap.js and handles payment flow.
 */

import { useCallback, useEffect, useState } from 'react'

declare global {
    interface Window {
        snap?: {
            pay: (token: string, options: SnapCallbacks) => void
            hide: () => void
        }
    }
}

interface SnapCallbacks {
    onSuccess?: (result: SnapResult) => void
    onPending?: (result: SnapResult) => void
    onError?: (result: SnapResult) => void
    onClose?: () => void
}

interface SnapResult {
    status_code: string
    status_message: string
    transaction_id?: string
    order_id: string
    gross_amount: string
    payment_type: string
    transaction_time: string
    transaction_status: string
    fraud_status?: string
    finish_redirect_url?: string
    pdf_url?: string
}

interface MidtransCheckoutProps {
    /** Snap token from createTransaction */
    snapToken: string
    /** Client key for Snap.js */
    clientKey: string
    /** Whether to use production Snap.js */
    isProduction?: boolean
    /** Callback when payment succeeds */
    onSuccess?: (result: SnapResult) => void
    /** Callback when payment is pending */
    onPending?: (result: SnapResult) => void
    /** Callback when payment fails */
    onError?: (result: SnapResult) => void
    /** Callback when popup is closed */
    onClose?: () => void
    /** Auto-trigger payment popup on mount */
    autoOpen?: boolean
    /** Custom button text */
    buttonText?: string
    /** Button class name */
    className?: string
    /** Disable button */
    disabled?: boolean
}

export function MidtransCheckout({
    snapToken,
    clientKey,
    isProduction = false,
    onSuccess,
    onPending,
    onError,
    onClose,
    autoOpen = false,
    buttonText = 'Pay with Midtrans',
    className = '',
    disabled = false,
}: MidtransCheckoutProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Snap.js URL based on environment
    const snapJsUrl = isProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'

    // Load Snap.js script
    useEffect(() => {
        // Check if already loaded
        if (window.snap) {
            setIsLoaded(true)
            return
        }

        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="snap.js"]`)
        if (existingScript) {
            existingScript.addEventListener('load', () => setIsLoaded(true))
            return
        }

        // Create and load script
        const script = document.createElement('script')
        script.src = snapJsUrl
        script.setAttribute('data-client-key', clientKey)
        script.async = true

        script.onload = () => {
            setIsLoaded(true)
        }

        script.onerror = () => {
            setError('Failed to load Midtrans Snap')
        }

        document.head.appendChild(script)

        return () => {
            // Don't remove script on unmount as it might be needed elsewhere
        }
    }, [snapJsUrl, clientKey])

    // Auto-open popup if configured
    useEffect(() => {
        if (autoOpen && isLoaded && snapToken) {
            handlePayment()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpen, isLoaded, snapToken])

    // Handle payment button click
    const handlePayment = useCallback(() => {
        if (!window.snap) {
            setError('Midtrans Snap not loaded')
            return
        }

        if (!snapToken) {
            setError('No snap token provided')
            return
        }

        setIsLoading(true)
        setError(null)

        window.snap.pay(snapToken, {
            onSuccess: (result) => {
                setIsLoading(false)
                console.log('[Midtrans] Payment success:', result)
                onSuccess?.(result)
            },
            onPending: (result) => {
                setIsLoading(false)
                console.log('[Midtrans] Payment pending:', result)
                onPending?.(result)
            },
            onError: (result) => {
                setIsLoading(false)
                console.error('[Midtrans] Payment error:', result)
                onError?.(result)
            },
            onClose: () => {
                setIsLoading(false)
                console.log('[Midtrans] Popup closed')
                onClose?.()
            },
        })
    }, [snapToken, onSuccess, onPending, onError, onClose])

    if (error) {
        return (
            <div className="midtrans-checkout-error text-red-500">
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="underline"
                >
                    Reload page
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={handlePayment}
            disabled={disabled || !isLoaded || isLoading || !snapToken}
            className={`midtrans-checkout-button ${className}`}
            type="button"
        >
            {isLoading ? 'Processing...' : isLoaded ? buttonText : 'Loading...'}
        </button>
    )
}

export default MidtransCheckout
