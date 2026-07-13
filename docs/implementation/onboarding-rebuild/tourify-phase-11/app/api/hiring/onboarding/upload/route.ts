import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

import { getAuthenticatedUserId } from "@/lib/api/hiring-route-helpers"
import { uploadHiringDocumentFormSchema } from "@/lib/hiring/hiring-compliance-schema"
import { HiringOnboardingUploadService } from "@/lib/services/hiring-onboarding-upload.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import type { HiringEntity } from "@/types/hiring-entity"

function getOptionalString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

export async function POST(request: NextRequest) {
  const supabase = createHiringServiceClient()
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 })
  }

  const headerToken = request.headers.get("x-onboarding-token") ?? undefined
  const parsed = uploadHiringDocumentFormSchema.safeParse({
    token: getOptionalString(formData.get("token")) ?? headerToken,
    candidate_id: getOptionalString(formData.get("candidate_id")),
    staff_member_id: getOptionalString(formData.get("staff_member_id")),
    employer_entity_type: getOptionalString(formData.get("employer_entity_type")),
    employer_entity_id: getOptionalString(formData.get("employer_entity_id")),
    field_id: getOptionalString(formData.get("field_id")),
    label: getOptionalString(formData.get("label")),
    credential_type: getOptionalString(formData.get("credential_type")),
    document_type: getOptionalString(formData.get("document_type")) ?? "general_document",
    expires_at: getOptionalString(formData.get("expires_at")),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload payload.", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const employer: HiringEntity | undefined = parsed.data.employer_entity_type && parsed.data.employer_entity_id
    ? {
        entityType: parsed.data.employer_entity_type,
        entityId: parsed.data.employer_entity_id,
        displayName: "Employer",
      }
    : undefined

  let actorUserId: string | undefined
  if (!parsed.data.token) {
    const auth = await getAuthenticatedUserId({ request, supabase })
    if (!auth.ok) return NextResponse.json({ error: auth.error.message }, { status: 401 })
    actorUserId = auth.data
  }

  const service = new HiringOnboardingUploadService({ supabase })
  const result = await service.uploadDocument({
    actorUserId,
    token: parsed.data.token,
    candidateId: parsed.data.candidate_id,
    staffMemberId: parsed.data.staff_member_id,
    employer,
    fieldId: parsed.data.field_id,
    label: parsed.data.label,
    credentialType: parsed.data.credential_type,
    documentType: parsed.data.document_type,
    file,
    expiresAt: parsed.data.expires_at,
  })

  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true, data: result.data, document: result.data })
}
