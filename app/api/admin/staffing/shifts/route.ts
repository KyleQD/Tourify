import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { resolveHiringActorFromRequest } from "@/lib/api/hiring-route-helpers"
import { resolveSchedulingOrgId } from "@/lib/hiring/resolve-scheduling-org-id"
import {
  validateWorkforceAssignmentParents,
  workforceAuthorityErrorResponse,
} from "@/lib/admin/workforce-authority.service"
import { upsertShiftLinkedAssignment } from "@/lib/admin/workforce-assignment.service"
import { projectWorkforceRecords } from "@/lib/admin/workforce-field-projections"
import { createClient } from "@/lib/supabase/server"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { hasEntityPermission } from "@/lib/services/rbac"
import type { HiringEntity } from "@/types/hiring-entity"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"

const HIRING_SHIFT_VIEW_CAPS: readonly AdminCapability[] = ["workforce.view"]

const createSchema = z
  .object({
    venue_id: z.string().uuid().optional(),
    org_id: z.string().uuid().optional(),
    entity_type: z.enum(["venue", "organization", "artist"]).optional(),
    entity_id: z.string().uuid().optional(),
    event_id: z.string().uuid().optional(),
    staff_member_id: z.string().uuid(),
    shift_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    break_duration: z.number().int().min(0).default(0),
    zone_assignment: z.string().optional(),
    role_assignment: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).optional(),
    /** When true, sync Work Mode invite and notify the worker immediately. */
    notify: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (!value.venue_id && !value.org_id && !(value.entity_type && value.entity_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide venue_id, org_id, or entity_type + entity_id",
      })
    }
  })

async function canAccessVenueOrEvent(args: {
  userId: string
  venueId?: string | null
  eventId?: string | null
  write?: boolean
}): Promise<boolean> {
  const permission = args.write ? "ASSIGN_EVENT_ROLES" : "EDIT_EVENT_LOGISTICS"
  if (args.venueId) {
    const canVenue = await hasEntityPermission({
      userId: args.userId,
      entityType: "Venue",
      entityId: args.venueId,
      permission,
    })
    if (canVenue) return true
  }
  if (args.eventId) {
    const canEvent =
      (await hasEntityPermission({
        userId: args.userId,
        entityType: "Event",
        entityId: args.eventId,
        permission,
      })) ||
      (await hasEntityPermission({
        userId: args.userId,
        entityType: "Event",
        entityId: args.eventId,
        permission: "ASSIGN_EVENT_ROLES",
      }))
    if (canEvent) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const input = createSchema.parse(await req.json())
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    let employer: HiringEntity | null = null
    let resolvedOrgId = input.org_id ?? null

    if (input.entity_type && input.entity_id) {
      const hiringSupabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({
        request: req,
        supabase: hiringSupabase,
        body: input,
        requirePermission: true,
      })
      if (!actorResult.ok) {
        return NextResponse.json(
          { error: actorResult.error.message, code: actorResult.error.code },
          { status: actorResult.error.code === "UNAUTHORIZED" ? 401 : 403 },
        )
      }
      employer = actorResult.data.employer
      if (!resolvedOrgId) {
        resolvedOrgId = await resolveSchedulingOrgId({
          supabase: hiringSupabase,
          employer: actorResult.data.employer,
        })
      }
    }

    let venueId =
      input.venue_id ??
      (employer?.entityType === "venue" ? employer.entityId : null)

    // Org-scoped creates often omit venue_id, but staff_shifts.venue_id is
    // NOT NULL. Resolve it from real event data before failing.
    if (!venueId && input.event_id) {
      const { data: eventRow } = await supabase
        .from("events")
        .select("venue_id")
        .eq("id", input.event_id)
        .maybeSingle()
      if (eventRow?.venue_id) venueId = String(eventRow.venue_id)
    }
    if (!venueId && resolvedOrgId) {
      const { data: orgEventRow } = await supabase
        .from("events")
        .select("venue_id")
        .eq("org_id", resolvedOrgId)
        .not("venue_id", "is", null)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (orgEventRow?.venue_id) venueId = String(orgEventRow.venue_id)
    }

    if (!venueId) {
      return NextResponse.json(
        { error: "Select a venue for this shift. No venue could be resolved from the event or organization." },
        { status: 400 },
      )
    }

    const allowedViaHiring = Boolean(employer)
    const allowedViaRbac = await canAccessVenueOrEvent({
      userId: user.id,
      venueId,
      eventId: input.event_id,
      write: true,
    })

    if (!allowedViaHiring && !allowedViaRbac) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // WORK-102: org-scoped shifts validate event + staff parents before write.
    if (resolvedOrgId) {
      try {
        await validateWorkforceAssignmentParents({
          supabase,
          userId: user.id,
          orgId: resolvedOrgId,
          eventId: input.event_id ?? null,
          staffMemberId: input.staff_member_id,
          role: input.role_assignment ?? null,
        })
      } catch (authorityError) {
        const resolved = workforceAuthorityErrorResponse(authorityError, "Parent validation failed")
        return NextResponse.json(
          { error: resolved.message, code: resolved.code },
          { status: resolved.status },
        )
      }
    }

    const { notify, entity_type: _entityType, entity_id: _entityId, ...shiftInput } = input
    const { data, error } = await supabase
      .from("staff_shifts")
      .insert({
        venue_id: venueId,
        org_id: resolvedOrgId,
        event_id: shiftInput.event_id,
        staff_member_id: shiftInput.staff_member_id,
        shift_date: shiftInput.shift_date,
        start_time: shiftInput.start_time,
        end_time: shiftInput.end_time,
        break_duration: shiftInput.break_duration,
        zone_assignment: shiftInput.zone_assignment,
        role_assignment: shiftInput.role_assignment,
        notes: shiftInput.notes,
        status: shiftInput.status ?? "scheduled",
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const sync = await upsertShiftLinkedAssignment({
      supabase,
      shift: data,
      notify: Boolean(notify),
      actorUserId: user.id,
      assignmentStatus: data.status === "confirmed" ? "confirmed" : "invited",
    })

    return NextResponse.json({
      data: projectWorkforceRecords([data as Record<string, unknown>], {
        capabilities: HIRING_SHIFT_VIEW_CAPS,
      })[0],
      sync,
    })
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? "Invalid payload" : (e as Error)?.message || "Unexpected error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const venueId = url.searchParams.get("venueId") || url.searchParams.get("venue_id") || undefined
    const orgIdParam = url.searchParams.get("org_id") || undefined
    const entityType = url.searchParams.get("entity_type") || undefined
    const entityId = url.searchParams.get("entity_id") || undefined
    const eventId = url.searchParams.get("eventId") || url.searchParams.get("event_id") || undefined
    const staffMemberId = url.searchParams.get("staff_member_id") || undefined
    const status = url.searchParams.get("status") || undefined
    const dateFrom = url.searchParams.get("date_from") || undefined
    const dateTo = url.searchParams.get("date_to") || undefined

    if (!venueId && !orgIdParam && !(entityType && entityId)) {
      return NextResponse.json(
        { error: "Provide venueId, org_id, or entity_type + entity_id" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    let resolvedOrgId = orgIdParam ?? null
    let allowedViaHiring = false

    if (entityType && entityId) {
      const hiringSupabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({
        request: req,
        supabase: hiringSupabase,
        requirePermission: true,
      })
      if (!actorResult.ok) {
        return NextResponse.json(
          { error: actorResult.error.message, code: actorResult.error.code },
          { status: actorResult.error.code === "UNAUTHORIZED" ? 401 : 403 },
        )
      }
      allowedViaHiring = true
      if (!resolvedOrgId) {
        resolvedOrgId = await resolveSchedulingOrgId({
          supabase: hiringSupabase,
          employer: actorResult.data.employer,
        })
      }
      if (!venueId && actorResult.data.employer.entityType === "venue") {
        // Venue employers can list without an explicit venueId query param.
        const venueEmployerId = actorResult.data.employer.entityId
        const canRead = await canAccessVenueOrEvent({
          userId: user.id,
          venueId: venueEmployerId,
          eventId,
        })
        if (!canRead && !allowedViaHiring) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        let query = supabase.from("staff_shifts").select("*").eq("venue_id", venueEmployerId)
        if (eventId) query = query.eq("event_id", eventId)
        if (staffMemberId) query = query.eq("staff_member_id", staffMemberId)
        if (status) query = query.eq("status", status)
        if (dateFrom) query = query.gte("shift_date", dateFrom)
        if (dateTo) query = query.lte("shift_date", dateTo)

        const { data, error } = await query
          .order("shift_date", { ascending: true })
          .order("start_time", { ascending: true })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({
          data: projectWorkforceRecords((data ?? []) as Record<string, unknown>[], {
            capabilities: HIRING_SHIFT_VIEW_CAPS,
          }),
        })
      }
    }

    if (venueId) {
      const canRead = await canAccessVenueOrEvent({ userId: user.id, venueId, eventId })
      if (!canRead && !allowedViaHiring) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      let query = supabase.from("staff_shifts").select("*").eq("venue_id", venueId)
      if (eventId) query = query.eq("event_id", eventId)
      if (staffMemberId) query = query.eq("staff_member_id", staffMemberId)
      if (status) query = query.eq("status", status)
      if (dateFrom) query = query.gte("shift_date", dateFrom)
      if (dateTo) query = query.lte("shift_date", dateTo)

      const { data, error } = await query
        .order("shift_date", { ascending: true })
        .order("start_time", { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({
        data: projectWorkforceRecords((data ?? []) as Record<string, unknown>[], {
          capabilities: HIRING_SHIFT_VIEW_CAPS,
        }),
      })
    }

    if (!allowedViaHiring) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!resolvedOrgId) {
      // Hiring-authorized artist/org without a resolvable ops org: empty board, not a hard failure.
      return NextResponse.json({ data: [] })
    }

    let query = supabase.from("staff_shifts").select("*").eq("org_id", resolvedOrgId)
    if (eventId) query = query.eq("event_id", eventId)
    if (staffMemberId) query = query.eq("staff_member_id", staffMemberId)
    if (status) query = query.eq("status", status)
    if (dateFrom) query = query.gte("shift_date", dateFrom)
    if (dateTo) query = query.lte("shift_date", dateTo)

    const { data, error } = await query
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({
      data: projectWorkforceRecords((data ?? []) as Record<string, unknown>[], {
        capabilities: HIRING_SHIFT_VIEW_CAPS,
      }),
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || "Unexpected error" }, { status: 400 })
  }
}
