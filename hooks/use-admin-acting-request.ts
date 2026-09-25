'use client'

import { useCallback, useEffect, useRef } from 'react'

import { isOrganizationType } from '@/lib/accounts/account-types'
import { useActingContext } from '@/hooks/use-acting-context'

export const ADMIN_ACTING_CONTEXT_NOT_READY =
  'Select an organization account before continuing.'

export function buildAdminActingRequestInit(
  actingHeaders: Record<string, string>,
  init: RequestInit = {},
  signal?: AbortSignal,
): RequestInit {
  const headers = new Headers(init.headers)
  for (const [name, value] of Object.entries(actingHeaders)) {
    headers.set(name, value)
  }

  return {
    ...init,
    credentials: init.credentials ?? 'include',
    headers,
    signal: signal ?? init.signal,
  }
}

/**
 * Organization-aware fetch for Admin client surfaces.
 *
 * The visible account changes synchronously while its server session is persisted
 * in the background. Sending the verified acting-account assertions keeps requests
 * bound to the account the user can currently see and cancels stale responses when
 * that visible account changes.
 */
export function useAdminActingRequest() {
  const {
    actingHeaders,
    actingContextKey,
    actingType,
    isActingReady,
  } = useActingContext()
  const controllersRef = useRef(new Set<AbortController>())
  const organizationId = actingHeaders['x-acting-org-id'] || null
  const isAdminReady = isActingReady && isOrganizationType(actingType) && Boolean(organizationId)

  useEffect(() => {
    const controllers = controllersRef.current
    return () => {
      for (const controller of controllers) controller.abort()
      controllers.clear()
    }
  }, [actingContextKey])

  const adminFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      if (!isAdminReady) throw new Error(ADMIN_ACTING_CONTEXT_NOT_READY)

      const controller = new AbortController()
      const externalSignal = init.signal
      const abortFromExternalSignal = () => controller.abort(externalSignal?.reason)
      if (externalSignal?.aborted) abortFromExternalSignal()
      else externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })

      controllersRef.current.add(controller)
      try {
        return await fetch(
          input,
          buildAdminActingRequestInit(actingHeaders, init, controller.signal),
        )
      } finally {
        controllersRef.current.delete(controller)
        externalSignal?.removeEventListener('abort', abortFromExternalSignal)
      }
    },
    [actingHeaders, isAdminReady],
  )

  return {
    adminFetch,
    actingContextKey,
    isAdminReady,
    organizationId,
  }
}
