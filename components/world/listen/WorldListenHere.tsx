"use client"

/**
 * P16-T01 — WorldListenHere: Live Radio, Tourify Music, Signature Sounds
 * (instrument samples), Guided Listening (narration), and Archive Audio.
 *
 * Every section has loading/empty/error states; every playable row carries a
 * source label (T06) and capability-aware controls (T04). Playback routes
 * through the central resolver only (T03).
 */
import { Disc3, Headphones, Library, Radio, Waves } from "lucide-react"

import { SOURCE_LABEL_META } from "@/lib/world/listen/source-labels"

import { WorldRadioCard, type WorldRadioCardStation } from "./WorldRadioCard"

export interface ListenHereData {
  status: "ok" | "empty" | "error" | "unauthorized"
  message?: string | null
  stations?: WorldRadioCardStation[]
  /** Canonical track ids for Tourify Music — resolved at play time. */
  tourifyTrackIds?: Array<{ id: string; title: string; artistName: string }>
  instrumentSampleIds?: Array<{ id: string; title: string }>
  guidedNarrationIds?: Array<{ id: string; title: string }>
  archiveAudioIds?: Array<{ id: string; title: string }>
}

interface Props {
  data: ListenHereData | null
  loading?: boolean
}

function LabelPill({ labelKey }: { labelKey: keyof typeof SOURCE_LABEL_META }) {
  const meta = SOURCE_LABEL_META[labelKey]
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300" title={meta.description}>
      {meta.display}
    </span>
  )
}

export function WorldListenHere({ data, loading = false }: Props) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy>
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    )
  }
  if (!data || data.status === "error") {
    return (
      <div className="rounded-lg border border-rose-300/15 bg-rose-300/[0.05] p-3 text-xs text-rose-200/85">
        {data?.message ?? "Listening data could not be loaded. Try again shortly."}
      </div>
    )
  }
  if (data.status === "unauthorized") {
    return (
      <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100/85">
        Sign in to listen. Playback is rights-resolved per account and region.
      </div>
    )
  }

  const stations = data.stations ?? []
  const tracks = data.tourifyTrackIds ?? []
  const samples = data.instrumentSampleIds ?? []
  const guides = data.guidedNarrationIds ?? []
  const archive = data.archiveAudioIds ?? []
  const empty = stations.length === 0 && tracks.length === 0 && samples.length === 0 && guides.length === 0 && archive.length === 0

  if (empty) {
    return (
      <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs text-emerald-100/80">
        No listening sources are active here yet. Stations appear after directory ingestion and rights review;
        playback stays rights-resolved end to end.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {stations.length > 0 && (
        <section aria-label="Live radio">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Radio className="h-3.5 w-3.5" /> Live Radio <LabelPill labelKey="live_radio" />
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {stations.slice(0, 6).map((station) => (
              <WorldRadioCard key={station.id} station={station} />
            ))}
          </div>
        </section>
      )}

      {tracks.length > 0 && (
        <section aria-label="Tourify music">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Disc3 className="h-3.5 w-3.5" /> Tourify Music <LabelPill labelKey="tourify_track" />
          </h4>
          <ul className="space-y-1">
            {tracks.slice(0, 8).map((track) => (
              <li key={track.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/[0.04]">
                <span className="truncate">{track.title}</span>
                <span className="ml-2 shrink-0 text-xs text-slate-500">{track.artistName}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {samples.length > 0 && (
        <section aria-label="Signature sounds">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Waves className="h-3.5 w-3.5" /> Signature Sounds <LabelPill labelKey="instrument_sample" />
          </h4>
          <p className="text-xs text-slate-500">{samples.length} approved instrument demonstrations staged.</p>
        </section>
      )}

      {guides.length > 0 && (
        <section aria-label="Guided listening">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Headphones className="h-3.5 w-3.5" /> Guided Listening <LabelPill labelKey="narration" />
          </h4>
          <p className="text-xs text-slate-500">{guides.length} narrated guides staged.</p>
        </section>
      )}

      {archive.length > 0 && (
        <section aria-label="Archive audio">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Library className="h-3.5 w-3.5" /> Archive Audio <LabelPill labelKey="archive_audio" />
          </h4>
          <p className="text-xs text-slate-500">{archive.length} rights-approved archival recordings staged.</p>
        </section>
      )}
    </div>
  )
}
