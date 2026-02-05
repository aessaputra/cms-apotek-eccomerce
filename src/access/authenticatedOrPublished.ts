import type { Access } from 'payload'

/**
 * Authenticated or Published access control
 * 
 * Allows access to authenticated users OR returns query constraint for published content.
 * Following AGENTS.md pattern for `authenticatedOrPublished` access.
 * 
 * Use for content that should be:
 * - Fully accessible to logged-in users
 * - Only published content visible to guests
 * 
 * @example
 * ```typescript
 * access: {
 *   read: authenticatedOrPublished,
 * }
 * ```
 */
export const authenticatedOrPublished: Access = ({ req: { user } }) => {
    // Authenticated users see all content
    if (user) return true

    // Guests only see published content
    return {
        _status: {
            equals: 'published',
        },
    }
}
