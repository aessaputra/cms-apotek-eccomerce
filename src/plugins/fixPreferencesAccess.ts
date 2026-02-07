import type { Plugin } from 'payload'

const PREFERENCES_SLUG = 'payload-preferences'

/**
 * Fix: QueryError "The following path cannot be queried: user.relationTo"
 *
 * When admin panel loads with a single auth collection (Admins), the preferences
 * collection access returns { 'user.relationTo': { equals: ... } } which triggers
 * validateQueryPaths to reject it in certain contexts.
 *
 * This plugin patches the preferences collection access in onInit to use only
 * user.value when there's a single auth collection - sufficient for unique identification.
 */
export const fixPreferencesAccess: Plugin = (incomingConfig) => {
  const authCollections = incomingConfig.collections?.filter((c) => c.auth) ?? []
  const hasSingleAuth = authCollections.length === 1

  if (!hasSingleAuth) return incomingConfig

  const preferencesAccess = () => (args: { req: { user?: { id: string } } }) => {
    if (!args.req.user?.id) return false
    return { 'user.value': { equals: args.req.user.id } }
  }

  const prevOnInit = incomingConfig.onInit
  return {
    ...incomingConfig,
    onInit: async (payload) => {
      if (prevOnInit) await prevOnInit(payload)
      const prefs = payload.config.collections?.find((c) => c.slug === PREFERENCES_SLUG)
      if (prefs && 'access' in prefs && prefs.access) {
        ;(prefs.access as Record<string, unknown>).read = preferencesAccess()
        ;(prefs.access as Record<string, unknown>).delete = preferencesAccess()
      }
    },
  }
}
