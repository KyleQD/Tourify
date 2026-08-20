import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { assertOrgEntityReferences, OrgEntityAccessError } from "@/lib/admin/org-entity-access"

const deviceSchema = z.object({
  action: z.literal("register_device").default("register_device"),
  event_id: z.string().uuid().optional().nullable(),
  device_name: z.string().trim().min(1).max(120),
  gate_assignment: z.string().trim().max(120).optional().nullable(),
  gate_permissions: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  assigned_user_id: z.string().uuid().optional().nullable(),
  is_offline_mode: z.boolean().optional().default(false),
}).strict()

/**
 * TIX-509 / TIX-511 — Scanner devices and admissions dashboard.
 */
export const GET = withAdminCapability(
  "ticketing.scan",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const eventId = searchParams.get("event_id")

      // Devices
      let devQuery = supabase
        .from("scanner_devices")
        .select("id, org_id, event_id, device_name, status, last_synced_at, gate_assignment, is_offline_mode, created_at")
        .eq("org_id", orgId)
        .order("last_synced_at", { ascending: false })
        .limit(50)
      if (eventId) devQuery = devQuery.eq("event_id", eventId)
      const { data: devices, error: devError } = await devQuery

      if (devError && devError.code === "42P01") {
        return NextResponse.json({
          success: true, devices: [], admissions: null, unavailable: true,
          unavailableReason: "Scanner devices table not yet migrated.", freshAt: new Date().toISOString(),
        })
      }
      if (devError) throw new Error(devError.message)

      // Admissions summary
      let admQuery = supabase
        .from("admissions_scans")
        .select("id, outcome, scanned_at")
        .eq("org_id", orgId)
        .limit(500)
      if (eventId) admQuery = admQuery.eq("event_id", eventId)
      const { data: scans } = await admQuery

      const safeDevices = ((devices ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), eventId: r.event_id ? String(r.event_id) : null,
          deviceName: String(r.device_name ?? ""),
          status: String(r.status ?? "active"),
          lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
          gateAssignment: r.gate_assignment ? String(r.gate_assignment) : null,
          isOfflineMode: Boolean(r.is_offline_mode),
        }
      })

      const safeScans = ((scans ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return { id: String(r.id), outcome: String(r.outcome ?? "admit"), scannedAt: r.scanned_at ? String(r.scanned_at) : null }
      })

      const admissions = {
        total: safeScans.length,
        admitted: safeScans.filter((s) => s.outcome === "admit").length,
        denied: safeScans.filter((s) => s.outcome === "deny").length,
        duplicate: safeScans.filter((s) => s.outcome === "duplicate").length,
        offlineQueued: safeScans.filter((s) => s.outcome === "offline_queued").length,
      }

      return NextResponse.json({ success: true, devices: safeDevices, admissions, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, devices: [], admissions: null, unavailable: true, unavailableReason: "Scanner devices table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Admissions unavailable" }, { status: 503 })
    }
  },
)

export const POST = withAdminCapability(
  "ticketing.scan",
  async (request: NextRequest, { supabase, admin, user }) => {
    try {
      const input = deviceSchema.parse(await request.json())
      if (input.event_id) {
        await assertOrgEntityReferences(supabase, admin.orgId, { eventId: input.event_id })
      }

      const { data, error } = await supabase
        .from("scanner_devices")
        .insert({
          org_id: admin.orgId,
          event_id: input.event_id ?? null,
          device_name: input.device_name,
          gate_assignment: input.gate_assignment ?? null,
          gate_permissions: input.gate_permissions ?? [],
          assigned_user_id: input.assigned_user_id ?? null,
          is_offline_mode: input.is_offline_mode,
          status: "active",
          created_by: user.id,
          last_synced_at: new Date().toISOString(),
        })
        .select("id, org_id, event_id, device_name, status, gate_assignment, gate_permissions, assigned_user_id, is_offline_mode, created_at")
        .single()

      if (error || !data) throw new Error(error?.message || "Unable to register scanner device")
      return NextResponse.json({ success: true, device: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", code: "validation_error", details: error.errors },
          { status: 400 },
        )
      }
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      return NextResponse.json({ error: "Scanner device could not be registered" }, { status: 503 })
    }
  },
)
