import type { User } from '@/payload-types'

export const checkRole = (allRoles: NonNullable<User['role']>[] = [], user?: User | null): boolean => {
  if (user && allRoles && user.role) {
    return allRoles.includes(user.role)
  }

  return false
}
