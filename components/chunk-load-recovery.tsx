'use client'

import { useEffect } from 'react'
import { isChunkLoadError } from '@/lib/utils/is-chunk-load-error'

const RELOAD_GUARD_KEY = 'tourify.chunk-reload-guard'

function maybeReloadOnce(source: string, detail: unknown) {
  // #region agent log
  fetch('http://127.0.0.1:7556/ingest/15f15573-361b-4909-ba46-1f6afc0001bf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a162f6'},body:JSON.stringify({sessionId:'a162f6',location:'chunk-load-recovery.tsx:maybeReloadOnce',message:'chunk load error detected',data:{source,detail:detail instanceof Error?{name:detail.name,message:detail.message}:String(detail)},timestamp:Date.now(),hypothesisId:'A-B-D'})}).catch(()=>{});
  // #endregion

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
      maybeReloadOnce('error', candidate)
    }

    function onRejection(event: PromiseRejectionEvent) {
      if (!isChunkLoadError(event.reason)) return
      event.preventDefault()
      maybeReloadOnce('unhandledrejection', event.reason)
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
