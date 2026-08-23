/**
 * P14-T02 — candidate inbox workspace. Single-record actions only (T10 bulk
 * operations stay deferred until this workflow is permission-proven).
 * Every action flows through the governed pipeline: session permission →
 * version CAS → frozen state machine → hash-chained audit event.
 */
import { getConsoleContext, hasWorldPermission } from "@/lib/world/console/db"

import { CandidateActions } from "./candidate-actions"

export const dynamic = "force-dynamic"

interface InboxRow {
  id: string
  entity_kind: string
  external_record_id: string
  match_status: string
  review_status: string
  confidence: number | null
  version: number | null
  updated_at: string
  source: { source_key: string } | null
}

export default async function ConsoleInbox() {
  const { trusted } = await getConsoleContext()
  const canReview = await hasWorldPermission("world.knowledge.review")

  const { data, error } = await trusted
    .from("world_ingestion_candidates")
    .select("id,entity_kind,external_record_id,match_status,review_status,confidence,version,updated_at,source:source_id(source_key)")
    .order("updated_at", { ascending: true })
    .limit(50)

  if (error) {
    return <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">Inbox unavailable: {error.message}</p>
  }

  const rows = (data ?? []) as InboxRow[]

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">Inbox empty.</p>
        <p className="mt-1 text-xs text-slate-500">Candidates appear here after ingestion runs create them.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!canReview && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100/85">
          Read-only: <code>world.knowledge.review</code> is required for any mutation. Organization roles do not confer World authority.
        </div>
      )}
      {rows.map((row) => (
        <article key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-100">
                {row.entity_kind} · <span className="font-mono text-xs text-slate-400">{row.external_record_id}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                source {row.source?.source_key ?? "—"} · confidence {row.confidence ?? "—"} · v{row.version ?? 1}
              </p>
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-300">review:{row.review_status}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-400">match:{row.match_status}</span>
            </div>
          </header>
          <div className="mt-3">
            <CandidateActions
              candidateId={row.id}
              version={row.version}
              matchStatus={row.match_status}
              canReview={canReview}
            />
          </div>
        </article>
      ))}
    </div>
  )
}
