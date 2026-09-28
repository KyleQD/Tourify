"use client"

import * as React from "react"

export type AutosaveStatus = "saved" | "saving" | "unsaved" | "error"

interface UseBuilderAutosaveOptions {
  enabled?: boolean
  delayMs?: number
  onSave: () => Promise<void>
  deps: unknown[]
}

export function useBuilderAutosave({
  enabled = true,
  delayMs = 1200,
  onSave,
  deps,
}: UseBuilderAutosaveOptions) {
  const [status, setStatus] = React.useState<AutosaveStatus>("unsaved")
  const [isSaving, setIsSaving] = React.useState(false)
  const isFirstRender = React.useRef(true)
  const saveRef = React.useRef(onSave)
  saveRef.current = onSave

  const markUnsaved = React.useCallback(() => {
    setStatus("unsaved")
  }, [])

  const runSave = React.useCallback(async () => {
    setIsSaving(true)
    setStatus("saving")
    try {
      await saveRef.current()
      setStatus("saved")
    } catch {
      setStatus("error")
    } finally {
      setIsSaving(false)
    }
  }, [])

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!enabled) return

    setStatus("unsaved")
    const handle = window.setTimeout(() => {
      void runSave()
    }, delayMs)

    return () => window.clearTimeout(handle)

  }, [enabled, delayMs, runSave, ...deps])

  return { status, setStatus, isSaving, setIsSaving, markUnsaved, runSave }
}
