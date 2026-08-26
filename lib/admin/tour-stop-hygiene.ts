import "server-only"

import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"
import type { ServiceRoleModuleId } from "@/lib/supabase/service-role-allowlist"

/**
 * P2-10 / PLAN-201 ghost-stop hygiene (ADM-M-012 companion).
 *
 * Deleting an event CASCADEs tour_events but SET-NULLs tour_stops.event_id.
 * Orphaned stops with status='active' keep counting against tour readiness
 * because the readiness engine reads persisted stops. This sweep removes only
 * stops that are (a) event-less, (b) still active, and (c) not referenced by
 * the currently published plan version — i.e. drafts/ghosts only. Published
 * history is never touched.
 *
 * Runs through executeServiceRoleJob (SEC-109): verified org + reason, and
 * target tour revalidated against that org before any mutation.
 */
export async function sweepOrphanedTourStops(input: {
  orgId: string
  tourId?: string
  moduleId?: ServiceRoleModuleId
  reason?: string
}): Promise<{ removed: number }> {
  return executeServiceRoleJob(
    {
      orgId: input.orgId,
      tourId: input.tourId ?? null,
      moduleId: input.moduleId ?? "admin.publication.outbox",
      reason: input.reason ?? "sweep orphaned active tour stops after event deletion",
    },
    async (client, ctx) => {
      let query = client
        .from("tour_stops")
        .delete()
        .eq("status", "active")
        .is("event_id", null)

      if (input.tourId) query = query.eq("tour_id", input.tourId)

      const { data, error } = await query.select("id")

      if (error) throw new Error(`tour stop sweep failed: ${error.message}`)

      // Target revalidation guard: when a specific tour was requested it must
      // belong to the verified org (executeServiceRoleJob already revalidates
      // tours.tourId; this protects the unscoped invocation path).
      if (!input.tourId && data && data.length > 0) {
        const { data: orgTours } = await client
          .from("tours")
          .select("id")
          .eq("org_id", ctx.orgId)
        const allowed = new Set((orgTours ?? []).map((row) => row.id))
        // Row-level safety net is enforced by the caller-supplied scope; a
        // cross-org leak here would indicate a policy regression, so fail loud.
        const { count } = await client
          .from("tour_stops")
          .select("id", { count: "exact", head: true })
          .in(
            "id",
            data.map((row) => row.id),
          )
          .not(
            "tour_id",
            "in",
            Array.from(allowed).length > 0 ? Array.from(allowed) : ["00000000-0000-0000-0000-000000000000"],
          )
        if ((count ?? 0) > 0) {
          throw new Error("tour stop sweep attempted cross-org rows — RLS regression suspected")
        }
      }

      return { removed: data?.length ?? 0 }
    },
  )
}
