import { type NextRequest } from "next/server"

import { resolveHiringActorFromRequest, routeErrorToResponse } from "@/lib/api/hiring-route-helpers"
import { exportRosterQuerySchema } from "@/lib/hiring/roster-schema"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createHiringServiceClient()
    const parsed = exportRosterQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))

    if (!parsed.success) {
      return Response.json({ error: "Invalid roster export query", details: parsed.error.flatten() }, { status: 400 })
    }

    const actorResult = await resolveHiringActorFromRequest({ request, supabase, requirePermission: true })
    if (!actorResult.ok) {
      return Response.json({ error: actorResult.error.message, details: actorResult.error.details }, { status: 403 })
    }

    const service = new HiringRosterService({ supabase })
    const result = await service.listRosterMembers({
      employer: actorResult.data.employer,
      status: parsed.data.status,
      complianceStatus: parsed.data.compliance_status,
      department: parsed.data.department,
      search: parsed.data.search,
      limit: 200,
      offset: 0,
    })

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Position",
      "Department",
      "Employment Type",
      "Status",
      "Compliance Status",
      "Assigned Zone",
      "Work Mode Status",
    ]

    const rows = result.members.map((member) => [
      member.profile.fullName,
      member.profile.email,
      member.profile.phone,
      member.position,
      member.department,
      member.employmentType,
      member.status,
      member.complianceStatus,
      member.assignedZone,
      member.workModeAssignment?.status,
    ])

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tourify-roster-${actorResult.data.employer.entityType}-${actorResult.data.employer.entityId}.csv"`,
      },
    })
  } catch (error) {
    return routeErrorToResponse(error)
  }
}
