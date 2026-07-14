'use client'

import { useEffect } from 'react'
import { isChunkLoadError } from '@/lib/utils/is-chunk-load-error'

const RELOAD_GUARD_KEY = 'tourify.chunk-reload-guard'

function maybeReloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
  } catch {
    // storage blocked — still attempt reload
  }
  window.location.reload()
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY)
    } catch {
      // ignore
    }

    function onError(event: ErrorEvent) {
      const candidate = event.error ?? event.message
      if (!isChunkLoadError(candidate)) return
      event.preventDefault()
      maybeReloadOnce()
    }

    function onRejection(event: PromiseRejectionEvent) {
      if (!isChunkLoadError(event.reason)) return
      event.preventDefault()
      maybeReloadOnce()
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
