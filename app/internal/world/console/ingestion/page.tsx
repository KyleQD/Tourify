/**
 * Ingestion inbox — candidates awaiting review, newest first.
 * Read-only v1 scaffold (spec §4/§5): actions land with the candidate
 * workspace slice and must route through governed review transitions.
 */
import { createClient } from "@/lib/supabase/server"
import { getConsoleContext, stableKey, type ConsoleCandidateRow } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

const KIND_FILTERS = ["all", "artist", "place", "radio_station", "cultural_entity"] as const

const badge = (label: string, tone: string) => (
  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${tone}`}>{label}</span>
)

export default async function IngestionInbox({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { kind } = await searchParams
  const activeKind = KIND_FILTERS.includes((kind ?? "all") as never) ? kind ?? "all" : "all"

  const { trusted } = await getConsoleContext()

  let query = trusted
    .from("world_ingestion_candidates")
    .select(
      "id,entity_kind,external_record_id,normalized_payload,match_status,review_status,confidence,updated_at,source:world_sources(source_key)",
    )
    .order("updated_at", { ascending: false })
    .limit(50)
  if (activeKind !== "all") query = query.eq("entity_kind", activeKind)

  const { data: rows } = await query

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((option) => (
          <a
            key={option}
            href={`/internal/world/console/ingestion?kind=${option}`}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              activeKind === option
                ? "border-violet-400/40 bg-violet-500/20 text-white"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-400/30"
            }`}
          >
            {option}
          </a>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">External ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Match</th>
              <th className="px-4 py-2">Review</th>
              <th className="px-4 py-2">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {((rows ?? []) as ConsoleCandidateRow[]).map((row) => {
              const payload = (row.normalized_payload ?? {}) as Record<string, unknown>
              return (
                <tr key={stableKey(row.entity_kind, row.external_record_id)} className="border-t border-white/5 text-slate-200">
                  <td className="px-4 py-2">{row.entity_kind}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {(row.source as { source_key?: string } | null)?.source_key ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {String(row.external_record_id).slice(0, 18)}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2">
                    {String(payload.name ?? payload.stationuuid ?? "—")}
                  </td>
                  <td className="px-4 py-2">{badge(row.match_status, row.match_status === "matched" ? "border-cyan-300/30 text-cyan-200" : "border-amber-300/30 text-amber-200")}</td>
                  <td className="px-4 py-2">{badge(row.review_status, "border-violet-300/30 text-violet-200")}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {row.confidence != null ? `${Math.round(Number(row.confidence) * 100)}%` : "—"}
                  </td>
                </tr>
              )
            })}
            {(rows ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No candidates for this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Raw payloads stay private server-side; this table renders normalized summaries only.
      </p>
    </div>
  )
}
