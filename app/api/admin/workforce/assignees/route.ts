import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"

const schema = z.object({
  tour_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  employer_entity_type: z.enum(["venue", "organization", "artist"]).optional(),
  employer_entity_id: z.string().uuid().optional(),
}).refine((value) => value.tour_id || value.event_id || value.employer_entity_id, "A workforce scope is required")

export const GET = withAdminCapability("workforce.view", async (request: NextRequest, { supabase, admin }) => {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) return NextResponse.json({ error: "Invalid assignee scope", details: parsed.error.flatten() }, { status: 400 })

  const input = parsed.data
  if (input.employer_entity_type === "organization" && input.employer_entity_id !== admin.orgId) {
    return NextResponse.json({ error: "The requested workforce belongs to another organization." }, { status: 403 })
  }
  if (input.tour_id) {
    const { data: tour } = await (supabase as any).from("tours").select("org_id").eq("id", input.tour_id).maybeSingle()
    if (!tour || tour.org_id !== admin.orgId) return NextResponse.json({ error: "The requested tour belongs to another organization." }, { status: 403 })
  }
  if (input.event_id) {
    const { data: event } = await (supabase as any).from("events_v2").select("org_id").eq("id", input.event_id).maybeSingle()
    if (!event || event.org_id !== admin.orgId) return NextResponse.json({ error: "The requested event belongs to another organization." }, { status: 403 })
  }
  const people = await listWorkforcePeople({
    supabase,
    tourId: input.tour_id ?? null,
    eventId: input.event_id ?? null,
    employerEntityType: input.employer_entity_type ?? null,
    employerEntityId: input.employer_entity_id ?? null,
    includePending: false,
    limit: 500,
  })
  const staffIds = people.map((person) => person.staffMemberId).filter((id): id is string => Boolean(id))
  const { data: staffRows } = staffIds.length
    ? await (supabase as any).from("staff_members").select("id,onboarding_progress,compliance_status,availability_schedule").in("id", staffIds)
    : { data: [] }
  const details = new Map((staffRows ?? []).map((row: any) => [row.id, row]))

  return NextResponse.json({
    assignees: people.filter((person) => person.staffMemberId).map((person) => {
      const detail = details.get(person.staffMemberId as string) as any
      return {
        staffMemberId: person.staffMemberId,
        userId: person.userId,
        name: person.name,
        email: person.email,
        role: person.role,
        complianceStatus: detail?.compliance_status ?? "not_started",
        onboardingProgress: detail?.onboarding_progress ?? 0,
        availability: detail?.availability_schedule ?? {},
      }
    }),
  })
})
