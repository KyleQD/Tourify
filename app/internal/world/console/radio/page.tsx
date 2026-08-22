/**
 * Radio review — draft station directory (spec §9, read-only v1).
 * Streams are intentionally NOT listed: world_radio_streams stays empty until
 * ingestion-policy review approves operational records separately.
 */
import { createClient } from "@/lib/supabase/server"
import { getConsoleContext, stableKey, type ConsoleStationRow } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

export default async function RadioReview() {
  const { trusted } = await getConsoleContext()

  const [stations, edges] = await Promise.all([
    trusted
      .from("world_radio_stations")
      .select("id,name,directory_provider,directory_external_id,languages,tags,rights_status,playback_status,review_status,publication_status,metadata,last_metadata_check_at")
      .order("name")
      .limit(100),
    trusted.from("world_radio_station_places").select("id", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100/85">
        Directory metadata ≠ broadcast permission. Every row below is draft / rights unknown /
        playback <strong>metadata_only</strong>. Operational stream records are not stored yet — enabling
        playback requires a separate ingestion-policy + rights review.
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2">Station</th>
              <th className="px-4 py-2">Directory</th>
              <th className="px-4 py-2">Languages</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Rights</th>
              <th className="px-4 py-2">States</th>
            </tr>
          </thead>
          <tbody>
            {((stations.data ?? []) as ConsoleStationRow[]).map((station) => {
              const meta = (station.metadata ?? {}) as Record<string, unknown>
              return (
                <tr key={stableKey(station.id)} className="border-t border-white/5 align-top text-slate-200">
                  <td className="px-4 py-2">{station.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {station.directory_provider}:{String(station.directory_external_id).slice(0, 8)}
                    {meta.bitrate_kbps ? ` · ${String(meta.bitrate_kbps)}kbps` : ""}
                    {meta.codec ? ` ${String(meta.codec)}` : ""}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">{(station.languages ?? []).join(", ") || "—"}</td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-xs text-slate-400">{(station.tags ?? []).slice(0, 6).join(", ")}</td>
                  <td className="px-4 py-2">{station.rights_status}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {station.review_status}/{station.publication_status}/{station.playback_status}
                  </td>
                </tr>
              )
            })}
            {(stations.data ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No stations staged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Candidate place edges: {edges.count ?? 0} · health checks and stream storage arrive with the
        ingestion-policy slice.
      </p>
    </div>
  )
}
