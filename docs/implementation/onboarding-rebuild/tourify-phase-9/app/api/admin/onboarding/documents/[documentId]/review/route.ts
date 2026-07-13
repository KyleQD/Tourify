import { NextRequest, NextResponse } from "next/server"

import { getAuthenticatedUserId } from "@/lib/api/hiring-route-helpers"
import { resolveHiringEntity } from "@/lib/auth/acting-context"
import { reviewCandidateDocumentSchema } from "@/lib/hiring/candidate-workflow-schema"
import { HiringCandidateWorkflowService } from "@/lib/services/hiring-candidate-workflow.service"
import type { HiringEntityType } from "@/types/hiring-entity"

interface RouteParams {
  params: {
    documentId: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = reviewCandidateDocumentSchema.safeParse({
    documentId: params.documentId,
    status: body.status,
    rejectionReason: body.rejection_reason ?? body.rejectionReason,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid document review payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const employer = await resolveHiringEntity({
    userId,
    entityType: body.employer_entity_type as HiringEntityType | undefined,
    entityId: body.employer_entity_id,
    venueId: body.venue_id,
  })

  const result = await HiringCandidateWorkflowService.reviewDocument({
    actorUserId: userId,
    employer,
    documentId: parsed.data.documentId,
    status: parsed.data.status,
    rejectionReason: parsed.data.rejectionReason,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 })

  return NextResponse.json({ ok: true })
}
