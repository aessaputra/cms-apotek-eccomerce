import type { Admin, User } from '@/payload-types'

type UserLike = (User | Admin) & { role?: string; collection?: string }

/**
 * Check if user has one of the given roles.
 * Admins collection users are always treated as 'admin' (no role field needed).
 */
export const checkRole = (allRoles: string[] = [], user?: UserLike | null): boolean => {
  if (!user || !allRoles?.length) return false
  // Admins collection = always admin
  if ('collection' in user && user.collection === 'admins') return allRoles.includes('admin')
  if (user.role && allRoles.includes(user.role)) return true
  return false
}
