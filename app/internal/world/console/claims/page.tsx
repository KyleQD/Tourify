/**
 * P14-T05 — claims review surface. Claims carry temporal scope, confidence,
 * and evidence links; edits here are audited and never auto-publish.
 */
import { getConsoleContext, hasWorldPermission } from "@/lib/world/console/db"

import { ClaimEditor } from "./claim-edit"

export const dynamic = "force-dynamic"

interface ClaimRow {
  id: string
  subject_entity_id: string | null
  object_place_id: string | null
  relation_key: string | null
  confidence: number | null
  valid_from: string | null
  valid_until: string | null
  version: number | null
}

export default async function ClaimsReview() {
  const { trusted } = await getConsoleContext()
  const canReview = await hasWorldPermission("world.knowledge.review")

  const { data, error } = await trusted
    .from("world_claims")
    .select("id,subject_entity_id,object_place_id,relation_key,confidence,valid_from,valid_until,version")
    .order("id")
    .limit(100)

  if (error) {
    return <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">Claims unavailable: {error.message}</p>
  }
  const rows = (data ?? []) as ClaimRow[]

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">No claims registered.</p>
        <p className="mt-1 text-xs text-slate-500">Curated claims appear once pilot corpora promote them.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!canReview && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100/85">
          Editing requires <code>world.knowledge.review</code>. Corrections create audited, version-guarded updates;
          publication state is managed separately.
        </div>
      )}
      {rows.map((claim) => (
        <article key={claim.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-slate-100">
              <span className="font-mono text-xs text-violet-300">{claim.relation_key ?? "relation"}</span>{" "}
              {claim.subject_entity_id?.slice(0, 8)} → {claim.object_place_id?.slice(0, 8)}
            </p>
            <span className="text-xs text-slate-500">
              conf {claim.confidence ?? "—"} · {claim.valid_from ?? "?"}–{claim.valid_until ?? "open"} · v{claim.version ?? 1}
            </span>
          </header>
          <ClaimEditor claimId={claim.id} version={claim.version} canReview={canReview} />
        </article>
      ))}
    </div>
  )
}
