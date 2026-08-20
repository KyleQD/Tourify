import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const schema = z.object({
  employerEntityType: z.enum(["venue", "organization", "artist"]),
  employerEntityId: z.string().uuid(),
  tourId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(240),
  role: z.string().trim().max(160).nullable().optional(),
  department: z.string().trim().max(160).nullable().optional(),
  shiftType: z.string().trim().max(80).default("event"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  requiredHeadcount: z.number().int().min(1).max(1000).default(1),
  requiredSkills: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().trim().min(1).default("UTC"),
  breakDurationMinutes: z.number().int().min(0).max(1440).default(0),
  breakRequirements: z.string().max(2000).nullable().optional(),
  location: z.object({
    type: z.enum(["onsite", "remote", "travel"]),
    venueId: z.string().uuid().nullable().optional(),
    name: z.string().max(300).nullable().optional(),
    address: z.string().max(1000).nullable().optional(),
    directions: z.string().max(4000).nullable().optional(),
    accessInstructions: z.string().max(4000).nullable().optional(),
  }),
  workerInstructions: z.string().max(8000).nullable().optional(),
  managerNotes: z.string().max(8000).nullable().optional(),
  supervisorName: z.string().max(300).nullable().optional(),
  supervisorContact: z.string().max(500).nullable().optional(),
  attirePpeCredentials: z.string().max(4000).nullable().optional(),
  hazards: z.string().max(4000).nullable().optional(),
  emergencyProcedure: z.string().max(4000).nullable().optional(),
  emergencyContact: z.string().max(500).nullable().optional(),
  attachments: z.array(z.record(z.string(), z.unknown())).max(100).default([]),
}).refine((value) => !value.startsAt || !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt), {
  message: "Shift end must be after its start",
  path: ["endsAt"],
})

export const POST = withAdminCapability("workforce.manage", async (request: NextRequest, { supabase, user, admin }) => {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid shift plan", details: parsed.error.flatten() }, { status: 400 })
  const input = parsed.data
  if (input.employerEntityType === "organization" && input.employerEntityId !== admin.orgId) {
    return NextResponse.json({ error: "The selected employer does not match the acting organization." }, { status: 403 })
  }
  if (input.tourId) {
    const { data: tour } = await (supabase as any).from("tours").select("id,org_id").eq("id", input.tourId).maybeSingle()
    if (!tour || tour.org_id !== admin.orgId) return NextResponse.json({ error: "The selected tour belongs to another organization." }, { status: 422 })
  }
  if (input.eventId) {
    const { data: event } = await (supabase as any).from("events_v2").select("id,org_id").eq("id", input.eventId).maybeSingle()
    if (!event || event.org_id !== admin.orgId) return NextResponse.json({ error: "The selected event belongs to another organization." }, { status: 422 })
    if (input.tourId) {
      const { data: relation } = await (supabase as any).from("tour_events").select("id").eq("tour_id", input.tourId).eq("event_id", input.eventId).maybeSingle()
      if (!relation) return NextResponse.json({ error: "The selected event is not part of this tour." }, { status: 422 })
    }
  }

  const { data: plan, error } = await (supabase as any).from("staff_shift_plans").insert({
    org_id: admin.orgId,
    employer_entity_type: input.employerEntityType,
    employer_entity_id: input.employerEntityId,
    tour_id: input.tourId ?? null,
    event_id: input.eventId ?? null,
    title: input.title,
    role: input.role ?? null,
    department: input.department ?? null,
    shift_type: input.shiftType,
    priority: input.priority,
    required_headcount: input.requiredHeadcount,
    required_skills: input.requiredSkills,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    timezone: input.timezone,
    break_duration_minutes: input.breakDurationMinutes,
    break_requirements: input.breakRequirements ?? null,
    location_type: input.location.type,
    venue_id: input.location.venueId ?? null,
    reporting_name: input.location.name ?? null,
    reporting_address: input.location.address ?? null,
    directions: input.location.directions ?? null,
    access_instructions: input.location.accessInstructions ?? null,
    worker_instructions: input.workerInstructions ?? null,
    supervisor_name: input.supervisorName ?? null,
    supervisor_contact: input.supervisorContact ?? null,
    attire_ppe_credentials: input.attirePpeCredentials ?? null,
    hazards: input.hazards ?? null,
    emergency_procedure: input.emergencyProcedure ?? null,
    emergency_contact: input.emergencyContact ?? null,
    attachments: input.attachments,
    created_by: user.id,
  }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })

  if (input.managerNotes) {
    const privateResult = await (supabase as any).from("staff_shift_plan_private_notes").insert({
      staff_shift_plan_id: plan.id,
      org_id: admin.orgId,
      manager_notes: input.managerNotes,
      updated_by: user.id,
    })
    if (privateResult.error) {
      await (supabase as any).from("staff_shift_plans").delete().eq("id", plan.id)
      return NextResponse.json({ error: "Shift plan was not saved; manager notes could not be secured." }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, plan }, { status: 201 })
})
