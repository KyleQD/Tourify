/**
 * Console dashboard — corpus + pipeline health at a glance.
 * Private staging reads use the privileged server client; the browser never
 * sees raw ingestion payloads.
 */
import { createClient } from "@/lib/supabase/server"
import { getConsoleContext, type ConsoleRunRow } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

type CountRow = { review_status: string; match_status: string; count: number }

export default async function ConsoleDashboard() {
  const { trusted } = await getConsoleContext()

  const [candidates, runs, stations, sources] = await Promise.all([
    trusted
      .from("world_ingestion_candidates")
      .select("review_status,match_status")
      .limit(5000),
    trusted
      .from("world_ingestion_runs")
      .select("adapter_key,status,request_count,records_received,candidates_created,error_count,started_at")
      .order("started_at", { ascending: false })
      .limit(50),
    trusted.from("world_radio_stations").select("id", { count: "exact", head: true }),
    trusted.from("world_sources").select("source_key").limit(1000),
  ])

  // P15-T08 — provider failure rate over the most recent runs.
  const runsList = (runs.data ?? []) as ConsoleRunRow[]
  const byAdapter = new Map<string, { total: number; failed: number }>()
  for (const run of runsList) {
    const entry = byAdapter.get(run.adapter_key) ?? { total: 0, failed: 0 }
    entry.total += 1
    if (run.status === "failed" || run.status === "partial") entry.failed += 1
    byAdapter.set(run.adapter_key, entry)
  }
  const failureRate = (adapterKey: string): string => {
    const entry = byAdapter.get(adapterKey)
    if (!entry || entry.total === 0) return "—"
    return `${Math.round((entry.failed / entry.total) * 100)}%`
  }

  const byReview = new Map<string, number>()
  const byMatch = new Map<string, number>()
  for (const row of (candidates.data ?? []) as CountRow[]) {
    byReview.set(row.review_status, (byReview.get(row.review_status) ?? 0) + 1)
    byMatch.set(row.match_status, (byMatch.get(row.match_status) ?? 0) + 1)
  }

  const stat = (label: string, value: string | number, accent = "text-violet-200") => (
    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Candidates", (candidates.data ?? []).length)}
        {stat(
          "Awaiting review",
          [...byReview.entries()].filter(([status]) => status !== "approved").reduce((sum, [, n]) => sum + n, 0),
          "text-amber-200",
        )}
        {stat("Draft stations", stations.count ?? 0, "text-cyan-200")}
        {stat("Registered sources", sources.data?.length ?? 0)}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Candidate states</h2>
        <div className="flex flex-wrap gap-2">
          {[...byReview.entries()].map(([status, count]) => (
            <span key={status} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-200">
              review:{status} · {count}
            </span>
          ))}
          {[...byMatch.entries()].map(([status, count]) => (
            <span key={status} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
              match:{status} · {count}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Provider health (recent runs)</h2>
        <div className="flex flex-wrap gap-2">
          {[...byAdapter.keys()].sort().map((adapterKey) => (
            <span key={adapterKey} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
              {adapterKey}: fail {failureRate(adapterKey)} · {byAdapter.get(adapterKey)!.total} runs
            </span>
          ))}
          {byAdapter.size === 0 && <span className="text-xs text-slate-500">No runs recorded yet.</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent ingestion runs</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Adapter</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Requests</th>
                <th className="px-4 py-2">Received</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {((runs.data ?? []) as ConsoleRunRow[]).map((run, index) => (
                <tr key={index} className="border-t border-white/5 text-slate-200">
                  <td className="px-4 py-2">{run.adapter_key}</td>
                  <td className="px-4 py-2">{run.status}</td>
                  <td className="px-4 py-2">{run.request_count}</td>
                  <td className="px-4 py-2">{run.records_received}</td>
                  <td className="px-4 py-2">{run.candidates_created}</td>
                  <td className="px-4 py-2">{run.error_count || "—"}</td>
                </tr>
              ))}
              {(runs.data ?? []).length === 0 && (
                <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>No runs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Approve/reject actions arrive with the candidate workspace slice — this dashboard is read-only by design so no
        click can publish anything.
      </p>
    </div>
  )
}
