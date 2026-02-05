import type { Access } from 'payload'

/**
 * Admin or Editor role access control
 * 
 * Allows access to users with 'admin' or 'editor' roles.
 * Following AGENTS.md pattern for `adminsOrEditors` access.
 * 
 * Use for content management operations that should be:
 * - Accessible to admins (full control)
 * - Accessible to editors (content management)
 * 
 * @example
 * ```typescript
 * access: {
 *   create: adminsOrEditors,
 *   update: adminsOrEditors,
 * }
 * ```
 */
export const adminsOrEditors: Access = ({ req: { user } }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((user as any)?.role && ['admin', 'editor'].includes((user as any).role))
}
