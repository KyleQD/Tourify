import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * WORK-408 / WORK-410 — Scheduling conflicts.
 * Lists open assignment conflicts for the acting org.
 */
export const GET = withAdminCapability(
  "workforce.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
      const statusFilter = searchParams.get("status") ?? "open"

      const query = supabase
        .from("assignment_conflicts")
        .select(
          "id, org_id, tour_id, shift_id, person_id, conflict_type, severity, source, description, override_reason, override_actor, overridden_at, status, created_at, updated_at",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (statusFilter !== "all") {
        void query.eq("status", statusFilter)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            conflicts: [],
            summary: { total: 0, open: 0, critical: 0, warning: 0 },
            unavailable: true,
            unavailableReason: "Assignment conflicts table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const conflicts = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          shiftId: r.shift_id ? String(r.shift_id) : null,
          personId: r.person_id ? String(r.person_id) : null,
          conflictType: String(r.conflict_type ?? "unknown"),
          severity: String(r.severity ?? "warning") as "warning" | "critical",
          source: String(r.source ?? "system"),
          description: r.description ? String(r.description) : null,
          overrideReason: r.override_reason ? String(r.override_reason) : null,
          overrideActor: r.override_actor ? String(r.override_actor) : null,
          overriddenAt: r.overridden_at ? String(r.overridden_at) : null,
          status: String(r.status ?? "open"),
          createdAt: String(r.created_at ?? ""),
          updatedAt: String(r.updated_at ?? ""),
        }
      })

      const openConflicts = conflicts.filter((c) => c.status === "open")
      const summary = {
        total: conflicts.length,
        open: openConflicts.length,
        critical: openConflicts.filter((c) => c.severity === "critical").length,
        warning: openConflicts.filter((c) => c.severity === "warning").length,
      }

      return NextResponse.json({
        success: true,
        conflicts,
        summary,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          conflicts: [],
          summary: { total: 0, open: 0, critical: 0, warning: 0 },
          unavailable: true,
          unavailableReason: "Assignment conflicts table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Workforce Conflicts]", error)
      return NextResponse.json({ error: "Conflicts unavailable", code: "conflicts_failed" }, { status: 503 })
    }
  },
)
