import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedUserId } from "@/lib/api/hiring-route-helpers"
import { complianceCandidateQuerySchema } from "@/lib/hiring/hiring-compliance-schema"
import { HiringComplianceService } from "@/lib/services/hiring-compliance.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import type { HiringEntity } from "@/types/hiring-entity"

interface RouteContext {
  params: Promise<{ candidateId: string }> | { candidateId: string }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const candidateId = params.candidateId
  const searchParams = request.nextUrl.searchParams
  const parsed = complianceCandidateQuerySchema.safeParse({
    entity_type: searchParams.get("entity_type"),
    entity_id: searchParams.get("entity_id"),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid employer scope.", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = createHiringServiceClient()
  const auth = await getAuthenticatedUserId({ request, supabase })
  if (!auth.ok) return NextResponse.json({ error: auth.error.message }, { status: 401 })

  const employer: HiringEntity = {
    entityType: parsed.data.entity_type,
    entityId: parsed.data.entity_id,
    displayName: "Employer",
  }

  const service = new HiringComplianceService({ supabase })
  const result = await service.getCandidateCompliance({
    actorUserId: auth.data,
    candidateId,
    employer,
  })

  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ data: result.data })
}
