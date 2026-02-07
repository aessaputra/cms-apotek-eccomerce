'use client'

import {
  Button,
  toast,
  useAuth,
  useConfig,
  useRouteTransition,
  useTranslation,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React, { useRef, useState } from 'react'

/**
 * Logout button for admin header - visible in header actions.
 * Default logout is in sidebar nav; this adds a prominent header button.
 * Follows Payload LogoutClient pattern: toast feedback, double-click prevention.
 */
export default function LogoutButton() {
  const { logOut, user } = useAuth()
  const { config } = useConfig()
  const { startRouteTransition } = useRouteTransition()
  const router = useRouter()
  const { t } = useTranslation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigatingRef = useRef(false)

  if (!user) return null

  const handleLogout = async () => {
    if (navigatingRef.current) return
    navigatingRef.current = true
    setIsLoggingOut(true)

    try {
      await logOut()
      toast.success(t('authentication:loggedOutSuccessfully'))
      const loginRoute = formatAdminURL({
        adminRoute: config.routes.admin,
        path: config.admin.routes.login,
      })
      startRouteTransition(() => router.push(loginRoute))
    } catch {
      toast.error(t('error:unknown'))
      navigatingRef.current = false
      setIsLoggingOut(false)
    }
  }

  return (
    <Button
      buttonStyle="secondary"
      disabled={isLoggingOut}
      el="button"
      onClick={handleLogout}
      size="small"
    >
      {isLoggingOut ? t('authentication:loggingOut') : t('authentication:logOut')}
    </Button>
  )
}
