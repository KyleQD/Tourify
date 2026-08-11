import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * WORK-601 — Attendance entries and manual correction ledger.
 * Lists attendance entries for the acting org with correction support.
 */

// GET — list attendance entries
export const GET = withAdminCapability(
  "workforce.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
      const eventId = searchParams.get("event_id")
      const workerId = searchParams.get("worker_id")
      const typeFilter = searchParams.get("entry_type")

      let query = supabase
        .from("attendance_entries")
        .select(
          "id, shift_id, worker_id, event_id, org_id, entry_type, recorded_at, correction_reason, approved_by, source, audit_entry, created_at",
        )
        .eq("org_id", orgId)
        .order("recorded_at", { ascending: false })
        .limit(limit)

      if (eventId) query = query.eq("event_id", eventId)
      if (workerId) query = query.eq("worker_id", workerId)
      if (typeFilter) query = query.eq("entry_type", typeFilter)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            entries: [],
            unavailable: true,
            unavailableReason: "Attendance entries table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const entries = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          shiftId: String(r.shift_id ?? ""),
          workerId: String(r.worker_id ?? ""),
          eventId: String(r.event_id ?? ""),
          orgId: String(r.org_id),
          entryType: String(r.entry_type ?? "check_in"),
          recordedAt: String(r.recorded_at ?? ""),
          correctionReason: r.correction_reason ? String(r.correction_reason) : null,
          approvedBy: r.approved_by ? String(r.approved_by) : null,
          source: String(r.source ?? "online"),
          auditEntry: r.audit_entry ? String(r.audit_entry) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      return NextResponse.json({
        success: true,
        entries,
        total: entries.length,
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
          entries: [],
          unavailable: true,
          unavailableReason: "Attendance entries table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Attendance]", error)
      return NextResponse.json({ error: "Attendance unavailable", code: "attendance_failed" }, { status: 503 })
    }
  },
)

// POST — manual correction entry
export const POST = withAdminCapability(
  "workforce.manage",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const body = (await request.json()) as Record<string, unknown>

      const { shiftId, workerId, eventId, recordedAt, correctionReason } = body as {
        shiftId?: string
        workerId?: string
        eventId?: string
        recordedAt?: string
        correctionReason?: string
      }

      if (!shiftId || !workerId || !eventId || !recordedAt || !correctionReason) {
        return NextResponse.json(
          { error: "shiftId, workerId, eventId, recordedAt, and correctionReason are required" },
          { status: 400 },
        )
      }

      const entryId = crypto.randomUUID()
      const auditEntry = `attendance:${entryId}:manual_correction`

      const { data, error } = await supabase.from("attendance_entries").insert({
        id: entryId,
        shift_id: shiftId,
        worker_id: workerId,
        event_id: eventId,
        org_id: orgId,
        entry_type: "manual_correction",
        recorded_at: recordedAt,
        correction_reason: correctionReason,
        approved_by: admin.userId,
        source: "online",
        audit_entry: auditEntry,
        created_at: new Date().toISOString(),
      })

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: false,
            unavailable: true,
            unavailableReason: "Attendance entries table not yet migrated.",
          })
        }
        throw new Error(error.message)
      }

      return NextResponse.json({ success: true, entry: data, auditEntry })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      console.error("[Admin Attendance POST]", error)
      return NextResponse.json({ error: "Failed to record correction", code: "correction_failed" }, { status: 503 })
    }
  },
)
