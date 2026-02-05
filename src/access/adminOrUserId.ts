import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control for documents owned by a user via 'user_id' field.
 * Admins have full access, authenticated users can access their own documents.
 * 
 * This is specifically designed for collections that use 'user_id' field to reference users,
 * such as cart_items.
 * 
 * @returns true for admins, Where query for users filtering by user_id field, false for guests
 */
export const adminOrUserId: Access = ({ req: { user } }) => {
    if (user) {
        if (checkRole(['admin'], user)) {
            return true
        }

        return {
            user_id: {
                equals: user.id,
            },
        }
    }

    return false
}
