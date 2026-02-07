import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control for Cart Items create operation.
 *
 * Best practice: Cart items are customer-owned data created by "add to cart" action in the app.
 * Admin should NOT create cart items (impersonation risk, data integrity).
 *
 * - Admin: denied (create is customer action only)
 * - Customer: can create only for their own cart (data.user === user.id)
 * - Guest: denied
 *
 * @see https://payloadcms.com/docs/access-control/collections#create
 */
export const cartItemsCreateAccess: Access = ({ req: { user }, data }) => {
    if (!user) return false

    // Admin cannot create - cart items are created by customer action, not admin
    if (checkRole(['admin'], user)) return false

    // Only owner can create cart item for their own cart
    const ownerId = typeof data?.user === 'object' && data?.user && 'id' in data?.user
        ? (data.user as { id: string }).id
        : data?.user

    return ownerId === user.id
}
