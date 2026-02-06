import type { Access, Where } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Access control for documents owned by a user via 'user' or 'user_id' field.
 * Admins have full access, authenticated users can access their own documents.
 * 
 * This is designed for collections that use 'user' field to reference users,
 * such as cart_items.
 * 
 * @returns true for admins, Where query for users filtering by owner field, false for guests
 */
export const adminOrUserId: Access = ({ req: { user } }) => {
    if (user) {
        if (checkRole(['admin'], user)) {
            return true
        }

        const query: Where = {
            or: [
                {
                    user: {
                        equals: user.id,
                    },
                },
                {
                    user_id: {
                        equals: user.id,
                    },
                },
            ],
        }
        return query
    }

    return false
}
