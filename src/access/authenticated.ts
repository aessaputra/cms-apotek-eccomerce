import type { Access } from 'payload'

/**
 * Authenticated-only access control
 * 
 * Allows access only to authenticated users.
 * Following AGENTS.md pattern for `authenticated` access.
 * 
 * @example
 * ```typescript
 * access: {
 *   create: authenticated,
 *   read: authenticated,
 * }
 * ```
 */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)
