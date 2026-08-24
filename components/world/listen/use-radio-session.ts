"use client"

/**
 * P16-T03/T04/T05 — live radio playback session.
 *
 * Playback always goes through the central resolver (`resolveViaPlaybackApi`)
 * — raw stream URLs never enter component data flow; the resolved URL is
 * used immediately and never stored. Capability labels come from the
 * resolver's capability matrix (live vs seekable). Transient errors drive
 * the bounded reconnect machine with honest terminal states.
 */
import { useCallback, useEffect, useReducer, useRef } from "react"

import { resolveViaPlaybackApi, type ResolveResult } from "@/lib/playback/client-resolve"
import {
  reduceRadioSession,
  type RadioSessionState,
} from "@/lib/world/listen/radio-session"

export type RadioTelemetryKind =
  | "play_start_success"
  | "reconnect"
  | "early_failure"
  | "rights_denied"
  | "terminal_unavailable"

export interface RadioSessionResult {
  state: RadioSessionState
  start: () => Promise<void>
  stop: () => void
}

interface Options {
  stationId: string
  /** Resolver override for tests (defaults to the central API door). */
  resolver?: (body: Record<string, unknown>) => Promise<ResolveResult>
  audioFactory?: () => HTMLAudioElement | null
  onEvent?: (kind: RadioTelemetryKind, detail?: { reconnectAttempt?: number }) => void
}

export function useRadioSession(options: Options): RadioSessionResult {
  const { stationId, onEvent } = options
  const [state, dispatch] = useReducer(reduceRadioSession, { phase: "idle" } as RadioSessionState)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearReconnectTimer()
    audioRef.current?.pause()
    if (audioRef.current) {
      audioRef.current.removeAttribute("src")
      audioRef.current.load?.()
    }
    audioRef.current = null
    dispatch("stopped")
  }, [clearReconnectTimer])

  // Leaving the surface tears the media element down completely.
  useEffect(() => stop, [stop])

  const attemptConnect = useCallback(
    async (reconnectAttempt?: number): Promise<void> => {
      const opts = optionsRef.current
      const result =
        (await opts.resolver?.({ kind: "radio_stream", stationId: opts.stationId })) ??
        (await resolveViaPlaybackApi({ kind: "radio_stream", stationId: opts.stationId }))
      if (!result.url) {
        const denied = /sign in|not enabled|rights|forbidden|403/i.test(result.error ?? "")
        if (denied) {
          onEvent?.("rights_denied")
          dispatch("rights_denied")
          return
        }
        if (!reconnectAttempt) onEvent?.("early_failure", {})
        dispatch("transient_error")
        return
      }
      let audio = opts.audioFactory?.() ?? null
      if (!audio && typeof Audio !== "undefined") audio = new Audio()
      if (!audio) {
        dispatch("transient_error")
        return
      }
      audio.src = result.url
      try {
        await audio.play()
        audioRef.current = audio
        if (reconnectAttempt) {
          onEvent?.("reconnect", { reconnectAttempt })
          dispatch("connected")
        } else {
          onEvent?.("play_start_success")
          dispatch("connected")
        }
      } catch {
        onEvent?.("early_failure", {})
        dispatch("transient_error")
      }
    },
    [onEvent, stationId],
  )

  // Reconnect loop: each entering of `reconnecting` schedules the next
  // bounded attempt after the reducer's backoff.
  const reconnectAttempt = state.phase === "reconnecting" ? state.attempt : null
  const reconnectBackoff = state.phase === "reconnecting" ? state.backoffMs : 0
  useEffect(() => {
    if (reconnectAttempt === null) return
    clearReconnectTimer()
    reconnectTimerRef.current = setTimeout(() => {
      void attemptConnect(reconnectAttempt)
    }, reconnectBackoff)
    return clearReconnectTimer
  }, [reconnectAttempt, reconnectBackoff, attemptConnect, clearReconnectTimer])

  const start = useCallback(async () => {
    dispatch("connect_requested")
    await attemptConnect(undefined)
  }, [attemptConnect])

  return { state, start, stop }
}
