"use client"

import { useEffect } from "react"
import { useProductEducation } from "./product-education-context"

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return Boolean(target.closest("[data-skip-global-help-shortcut]"))
}

export function EducationHotkey() {
  const { openHelp, startTour } = useProductEducation()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return
      if (isEditableTarget(e.target)) return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === "/") {
        e.preventDefault()
        openHelp()
        return
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openHelp])

  useEffect(() => {
    function onToggle() {
      openHelp()
    }
    function onTour(e: Event) {
      const detail = (e as CustomEvent<{ tourId?: string }>).detail
      if (detail?.tourId) startTour(detail.tourId)
    }
    window.addEventListener("toggleHelp", onToggle)
    window.addEventListener("tourify:start-tour", onTour as EventListener)
    return () => {
      window.removeEventListener("toggleHelp", onToggle)
      window.removeEventListener("tourify:start-tour", onTour as EventListener)
    }
  }, [openHelp, startTour])

  return null
}
