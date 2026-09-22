import { NextRequest, NextResponse } from "next/server"

import { detectDoubleBookings } from "@/lib/admin/staff-scheduling-conflicts"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * WORK-408 / WORK-410 — Scheduling conflicts.
 * Lists open conflicts for the acting org, derived live from real staff_shifts
 * data (double-booking detection). The legacy `assignment_conflicts` table was
 * never migrated, so conflicts are computed instead of stored.
 */
export const GET = withAdminCapability(
  "workforce.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
      const statusFilter = searchParams.get("status") ?? "open"

      // Derived conflicts are always "open" — other statuses have no rows.
      if (statusFilter !== "all" && statusFilter !== "open") {
        return NextResponse.json({
          success: true,
          conflicts: [],
          summary: { total: 0, open: 0, critical: 0, warning: 0 },
          freshAt: new Date().toISOString(),
        })
      }

      const today = new Date().toISOString().slice(0, 10)
      const through = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)

      // Resolve the org's staff first so venue-less org shifts are included
      // whether they are keyed by org_id or only by staff_member_id.
      const membersResult = await supabase
        .from("staff_members")
        .select("id, name")
        .eq("employer_entity_type", "organization")
        .eq("employer_entity_id", admin.profileId)
        .limit(500)
      if (membersResult.error) throw new Error(membersResult.error.message)
      const members = (membersResult.data ?? []) as Array<{ id: string; name: string }>
      const staffIds = members.map((member) => String(member.id)).filter(Boolean)
      const memberNames = new Map(members.map((member) => [String(member.id), member.name]))

      const shiftsResult = staffIds.length
        ? await supabase
            .from("staff_shifts")
            .select("id, staff_member_id, shift_date, start_time, end_time, role_assignment, status, created_at, updated_at")
            .in("staff_member_id", staffIds)
            .gte("shift_date", today)
            .lte("shift_date", through)
            .neq("status", "cancelled")
            .limit(500)
        : { data: [], error: null }
      if (shiftsResult.error) throw new Error(shiftsResult.error.message)

      const shiftRows = (shiftsResult.data ?? []) as Array<Record<string, unknown>>
      const shiftMeta = new Map(shiftRows.map((row) => [String(row.id), row]))
      const derived = detectDoubleBookings(
        shiftRows as unknown as Parameters<typeof detectDoubleBookings>[0],
      ).slice(0, limit)

      const conflicts = derived.map((conflict) => {
        const shift = conflict.shiftId ? shiftMeta.get(conflict.shiftId) : undefined
        const name = conflict.personId ? memberNames.get(conflict.personId) : undefined
        return {
          id: conflict.id,
          orgId,
          tourId: null,
          shiftId: conflict.shiftId,
          personId: conflict.personId,
          conflictType: conflict.conflictType,
          severity: conflict.severity,
          source: "derived",
          description: name ? `${name}: ${conflict.description}` : conflict.description,
          overrideReason: null,
          overrideActor: null,
          overriddenAt: null,
          status: conflict.status,
          createdAt: String(shift?.created_at ?? new Date().toISOString()),
          updatedAt: String(shift?.updated_at ?? shift?.created_at ?? new Date().toISOString()),
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
      console.error("[Admin Workforce Conflicts]", error)
      return NextResponse.json({ error: "Conflicts unavailable", code: "conflicts_failed" }, { status: 503 })
    }
  },
)
