import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedUserId } from "@/lib/api/hiring-route-helpers"
import { reviewHiringDocumentSchema } from "@/lib/hiring/hiring-compliance-schema"
import { HiringOnboardingUploadService } from "@/lib/services/hiring-onboarding-upload.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import type { HiringEntity } from "@/types/hiring-entity"

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { documentId } = await context.params
  const body = await request.json().catch(() => ({}))
  const parsed = reviewHiringDocumentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid document review payload.", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = createHiringServiceClient()
  const auth = await getAuthenticatedUserId({ request, supabase })
  if (!auth.ok) return NextResponse.json({ error: auth.error.message }, { status: 401 })

  const employer: HiringEntity = {
    entityType: parsed.data.employer_entity_type,
    entityId: parsed.data.employer_entity_id,
    displayName: "Employer",
  }

  const service = new HiringOnboardingUploadService({ supabase })
  const result = await service.reviewDocument({
    actorUserId: auth.data,
    documentId,
    employer,
    status: parsed.data.status,
    reviewNotes: parsed.data.review_notes,
  })

  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ data: result.data })
}
