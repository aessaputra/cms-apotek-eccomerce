'use client'

import { Button, useAuth, useConfig, useRouteTransition, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

/**
 * Logout button for admin header - visible in header actions.
 * Default logout is in sidebar nav; this adds a prominent header button.
 */
export default function LogoutButton() {
  const { logOut, user } = useAuth()
  const { config } = useConfig()
  const { startRouteTransition } = useRouteTransition()
  const router = useRouter()
  const { t } = useTranslation()

  if (!user) return null

  const handleLogout = async () => {
    await logOut()
    startRouteTransition(() => {
      router.push(
        formatAdminURL({
          adminRoute: config.routes.admin,
          path: config.admin.routes.login,
        }),
      )
    })
  }

  return (
    <Button
      buttonStyle="secondary"
      el="button"
      onClick={handleLogout}
      size="small"
    >
      {t('authentication:logOut')}
    </Button>
  )
}
