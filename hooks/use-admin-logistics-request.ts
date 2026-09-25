'use client'

import { useCallback, useRef } from 'react'

import { useAdminActingRequest } from '@/hooks/use-admin-acting-request'

export const ADMIN_LOGISTICS_STALE_REQUEST = 'Admin logistics request context changed.'

function staleRequestError() {
  return new DOMException(ADMIN_LOGISTICS_STALE_REQUEST, 'AbortError')
}

function guardResponseBody(response: Response, isCurrent: () => boolean): Response {
  const bodyReaders = new Set<PropertyKey>([
    'arrayBuffer',
    'blob',
    'bytes',
    'formData',
    'json',
    'text',
  ])

  return new Proxy(response, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (typeof value !== 'function') return value
      if (!bodyReaders.has(property)) return value.bind(target)

      return async (...args: unknown[]) => {
        const result = await value.apply(target, args)
        if (!isCurrent()) throw staleRequestError()
        return result
      }
    },
  })
}

/**
 * Stable organization-aware request adapter for the mounted Admin Logistics UI.
 *
 * The shared acting request aborts network work on account changes. This adapter
 * also guards delayed response-body parsing, so an already-resolved response
 * cannot repopulate state after the visible organization changes.
 */
export function useAdminLogisticsRequest() {
  const acting = useAdminActingRequest()
  const requestRef = useRef(acting.adminFetch)
  const contextKeyRef = useRef(acting.actingContextKey)

  requestRef.current = acting.adminFetch
  contextKeyRef.current = acting.actingContextKey

  const adminFetch = useCallback(async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> => {
    const requestContextKey = contextKeyRef.current
    const response = await requestRef.current(input, init)
    const isCurrent = () => requestContextKey === contextKeyRef.current
    if (!isCurrent()) throw staleRequestError()
    return guardResponseBody(response, isCurrent)
  }, [])

  return {
    adminFetch,
    actingContextKey: acting.actingContextKey,
    isAdminReady: acting.isAdminReady,
  }
}
