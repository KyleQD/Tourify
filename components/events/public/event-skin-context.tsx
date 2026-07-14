"use client"

import { createContext, useContext, useMemo } from "react"
import {
  EVENT_SKIN_TOKENS,
  getEventPageSkinTokens,
  resolveEventPageSkinId,
  type EventPageSkinId,
  type EventPageSkinTokens,
} from "@/lib/events/event-skin-tokens"

interface EventSkinContextValue {
  skinId: EventPageSkinId
  tokens: EventPageSkinTokens
}

const EventSkinContext = createContext<EventSkinContextValue>({
  skinId: "modern",
  tokens: EVENT_SKIN_TOKENS.modern,
})

interface EventSkinProviderProps {
  template?: string | null
  children: React.ReactNode
}

export function EventSkinProvider({ template, children }: EventSkinProviderProps) {
  const value = useMemo(() => {
    const skinId = resolveEventPageSkinId(template)
    return { skinId, tokens: getEventPageSkinTokens(skinId) }
  }, [template])

  return <EventSkinContext.Provider value={value}>{children}</EventSkinContext.Provider>
}

export function useEventSkin() {
  return useContext(EventSkinContext)
}
