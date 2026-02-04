import type { CollectionBeforeLoginHook } from 'payload'

/**
 * Prevents inactive users from logging in
 * This hook runs before login and checks if the user account is active
 */
export const preventInactiveLogin: CollectionBeforeLoginHook = async ({
  user,
}) => {
  // Check if user account is inactive
  if (user && (user as any).is_active === false) {
    throw new Error('Account is inactive. Please contact support.')
  }

  return user
}