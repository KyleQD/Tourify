/**
 * P14 — quality surface: staging health, unresolved geography, and audit
 * chain integrity. The audit verification recomputes the hash chain so
 * tampering with editorial history is detectable from the console itself.
 */
import { getConsoleContext, hasWorldPermission } from "@/lib/world/console/db"
import { verifyAuditChain, type AuditEventRow } from "@/lib/world/editorial/audit-events"

export const dynamic = "force-dynamic"

export default async function QualityReview() {
  const { trusted } = await getConsoleContext()
  const canAudit = await hasWorldPermission("world.knowledge.review")

  const [candidates, resolutions, runs] = await Promise.all([
    trusted.from("world_ingestion_candidates").select("review_status,match_status").limit(5000),
    trusted.from("world_place_resolution_candidates").select("id", { count: "exact", head: true }),
    trusted
      .from("world_ingestion_runs")
      .select("adapter_key,status,error_count")
      .order("started_at", { ascending: false })
      .limit(25),
  ])

  const rows = (candidates.data ?? []) as Array<{ review_status: string; match_status: string }>
  const open = rows.filter((r) => r.review_status !== "approved" && r.review_status !== "rejected").length
  const ambiguous = rows.filter((r) => r.match_status === "ambiguous").length
  const failingRuns = ((runs.data ?? []) as Array<{ adapter_key: string; status: string; error_count: number | null }>)
    .filter((r) => r.status !== "success")
    .map((r) => r.adapter_key)

  // Audit integrity (P14-T08): recompute the chain over the most recent window.
  let auditVerdict = "audit access requires review permission"
  if (canAudit) {
    const { data: auditRows } = await trusted
      .from("world_editorial_audit_events")
      .select("*")
      .order("occurred_at", { ascending: true })
      .limit(1000)
    const verdict = verifyAuditChain((auditRows ?? []) as unknown as AuditEventRow[])
    auditVerdict = verdict.valid
      ? `verified · ${(auditRows ?? []).length} events intact`
      : `TAMPERING DETECTED at ${verdict.brokenAt?.slice(0, 12)}…`
  }

  const stat = (label: string, value: string | number, accent = "text-violet-200") => (
    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Open candidates", open, open > 0 ? "text-amber-200" : "text-emerald-200")}
        {stat("Ambiguous matches", ambiguous, ambiguous > 0 ? "text-rose-200" : "text-emerald-200")}
        {stat("Unresolved places", resolutions.count ?? 0)}
        {stat("Failing runs", failingRuns.length || "0", failingRuns.length ? "text-rose-200" : "text-emerald-200")}
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold text-slate-200">Audit chain</h2>
        <p className={`mt-1 text-sm ${auditVerdict.startsWith("verified") ? "text-emerald-300/85" : auditVerdict.includes("TAMPERING") ? "text-rose-300" : "text-slate-400"}`}>
          {auditVerdict}
        </p>
      </section>
    </div>
  )
}
