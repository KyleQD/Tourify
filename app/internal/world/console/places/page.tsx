/**
 * P14-T03 — geography resolution workspace. Lists unresolved/ambiguous place
 * resolutions produced by capture flows and projectors. Resolution itself
 * reuses the CanonicalPlacePicker identity model; conflicts surface here
 * with source context instead of being silently guessed.
 */
import { getConsoleContext, stableKey } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

interface ResolutionRow {
  id: string
  entity_kind: string | null
  raw_display_string: string | null
  status: string | null
  reason: string | null
  created_at: string
}

export default async function PlacesResolution() {
  const { trusted } = await getConsoleContext()

  const { data, error } = await trusted
    .from("world_place_resolution_candidates")
    .select("id,entity_kind,raw_display_string,status,reason,created_at")
    .order("created_at", { ascending: true })
    .limit(100)

  if (error) {
    return <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">Resolution queue unavailable: {error.message}</p>
  }
  const rows = (data ?? []) as ResolutionRow[]

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">No unresolved geography.</p>
        <p className="mt-1 text-xs text-slate-500">Ambiguous captures from forms and projectors land here for review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3 text-xs text-cyan-100/80">
        Resolution rule of record: explicit canonical selection wins; ambiguous strings never auto-resolve. Attach the
        canonical place via the picker in the originating flow, then clear the candidate.
      </div>
      {rows.map((row) => (
        <article key={stableKey(row.id)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-slate-100">{row.raw_display_string ?? "(empty string)"}</p>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-400">{row.status ?? "open"}</span>
          </header>
          <p className="mt-1 text-xs text-slate-500">
            kind {row.entity_kind ?? "—"} · reason {row.reason ?? "—"} · captured {new Date(row.created_at).toLocaleDateString()}
          </p>
        </article>
      ))}
    </div>
  )
}
