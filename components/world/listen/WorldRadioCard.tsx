"use client"

/**
 * P16-T02/T04/T06 — WorldRadioCard: station identity, language/tags, live
 * state, health, source attribution, capability labels, reconnect UX, and
 * the report/correction hook. Playback flows exclusively through
 * useRadioSession (central resolver).
 */
import { useState } from "react"

import { Radio, SignalLow, ShieldAlert, TriangleAlert } from "lucide-react"

import { SOURCE_LABEL_META } from "@/lib/world/listen/source-labels"
import type { RadioSessionState } from "@/lib/world/listen/radio-session"

import { useRadioSession, type RadioTelemetryKind } from "./use-radio-session"

export interface WorldRadioCardStation {
  id: string
  name: string
  placeName?: string | null
  languages?: string[]
  tags?: string[]
  /** Directory provider for attribution — never a stream URL. */
  directoryProvider?: string | null
}

interface Props {
  station: WorldRadioCardStation
  /** Resolver-side health snapshot; "unhealthy" disables start. */
  playbackStatus?: "healthy" | "unhealthy" | "unknown"
  onTelemetry?: (kind: RadioTelemetryKind, detail?: { reconnectAttempt?: number }) => void
}

const stateCopy: Record<RadioSessionState["phase"], string> = {
  idle: "",
  connecting: "Connecting…",
  live: "Live",
  reconnecting: "Signal hiccup — reconnecting…",
  terminal: "Unavailable right now",
}

export function WorldRadioCard({ station, playbackStatus = "unknown", onTelemetry }: Props) {
  const session = useRadioSession({
    stationId: station.id,
    onEvent: onTelemetry,
  })
  const [reported, setReported] = useState<"idle" | "sent" | "failed">("idle")

  const rightsDenied = session.state.phase === "terminal" && session.state.reason === "rights_denied"
  const unavailable = session.state.phase === "terminal" && session.state.reason === "unavailable"
  const canStart =
    session.state.phase === "idle" && playbackStatus !== "unhealthy" && !rightsDenied && !unavailable

  const report = async () => {
    try {
      const response = await fetch("/api/world/stations/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: station.id,
          reportKind: playbackStatus === "unhealthy" ? "unavailable" : "correction",
          message: `Listener report from station card (${stateCopy[session.state.phase] || "browsing"}).`,
        }),
      })
      setReported(response.ok ? "sent" : "failed")
    } catch {
      setReported("failed")
    }
  }

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">{station.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[station.placeName, (station.languages ?? []).join("/"), (station.tags ?? []).slice(0, 3).join(" · ")]
              .filter(Boolean)
              .join(" · ") || "Directory metadata"}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200/90"
          title={SOURCE_LABEL_META.live_radio.description}
        >
          <Radio className="h-3 w-3" /> {SOURCE_LABEL_META.live_radio.display}
        </span>
      </header>

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {canStart && (
          <button
            type="button"
            onClick={() => void session.start()}
            className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60 disabled:opacity-50"
          >
            ▶ Listen live
          </button>
        )}
        {session.state.phase === "connecting" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" /> {stateCopy.connecting}
          </span>
        )}
        {session.state.phase === "live" && (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live · linear stream (no seek)
            </span>
            <button type="button" onClick={session.stop} className="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline">
              Stop
            </button>
          </>
        )}
        {session.state.phase === "reconnecting" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-300">
            <SignalLow className="h-3.5 w-3.5 animate-pulse" /> {stateCopy.reconnecting} ({session.state.attempt}/3)
          </span>
        )}
        {unavailable && (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-300">
            <TriangleAlert className="h-3.5 w-3.5" /> {stateCopy.terminal}
          </span>
        )}
        {(rightsDenied || playbackStatus === "unhealthy") && (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            {rightsDenied ? "Not available in this context (rights)" : "Marked unhealthy — playback disabled"}
          </span>
        )}

        <span className="ml-auto text-[10px] text-slate-600">
          via {station.directoryProvider ?? "radio directory"}
        </span>
      </footer>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void report()}
          className="text-[11px] text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline"
        >
          Report a problem with this station
        </button>
        {reported === "sent" && <span className="text-[11px] text-emerald-300/80">Reported — thank you.</span>}
        {reported === "failed" && <span className="text-[11px] text-rose-300/80">Could not send report.</span>}
      </div>
    </article>
  )
}
