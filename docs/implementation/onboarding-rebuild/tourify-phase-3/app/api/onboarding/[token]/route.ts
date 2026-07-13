import { NextResponse } from "next/server"
import { z } from "zod"

import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { buildTokenOnboardingPayload } from "@/lib/services/token-onboarding-payload.service"

const routeParamsSchema = z.object({
  token: z.string().min(12, "Invalid onboarding token"),
})

const submitOnboardingSchema = z.object({
  responses: z.record(z.unknown()),
  completed: z.boolean().default(false),
})

function getReadableError(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unexpected onboarding error"
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function getRequiredBlockingFields(payload: Awaited<ReturnType<typeof buildTokenOnboardingPayload>>): string[] {
  if (!payload) return []

  return payload.template.fields
    .filter((field) => field.required && field.blocking)
    .map((field) => field.name)
}

function getMissingBlockingFields({
  responses,
  requiredBlockingFields,
}: {
  responses: Record<string, unknown>
  requiredBlockingFields: string[]
}): string[] {
  return requiredBlockingFields.filter((fieldName) => {
    const value = responses[fieldName]

    if (value === null || value === undefined) return true
    if (typeof value === "string" && value.trim().length === 0) return true
    if (Array.isArray(value) && value.length === 0) return true
    if (typeof value === "boolean") return value !== true

    return false
  })
}

async function saveOnboardingResponses({
  token,
  payload,
  responses,
  completed,
}: {
  token: string
  payload: NonNullable<Awaited<ReturnType<typeof buildTokenOnboardingPayload>>>
  responses: Record<string, unknown>
  completed: boolean
}) {
  const supabase = createHiringServiceClient()
  const candidateId = readString(payload.candidate, "id")
  const invitationId = readString(payload.invitation, "id")
  const userId =
    readString(payload.candidate, "user_id") ??
    readString(payload.candidate, "applicant_id") ??
    readString(payload.invitation, "user_id") ??
    null

  const responseInsert = {
    candidate_id: candidateId,
    invitation_id: invitationId,
    user_id: userId,
    token,
    template_id: payload.template.id,
    employer_entity_type: payload.employer.entityType,
    employer_entity_id: payload.employer.entityId,
    responses,
    status: completed ? "submitted" : "draft",
    submitted_at: completed ? new Date().toISOString() : null,
  }

  const { error: responseError } = await supabase.from("onboarding_responses").insert(responseInsert)

  if (responseError) {
    return { ok: false as const, error: responseError.message }
  }

  if (candidateId) {
    const candidateUpdate = {
      status: completed ? "completed" : "in_progress",
      stage: completed ? "review" : "onboarding",
      onboarding_progress: completed ? 100 : Math.max(Number(payload.progress ?? 0), 50),
      onboarding_responses: responses,
      updated_at: new Date().toISOString(),
    }

    const { error: candidateError } = await supabase
      .from("staff_onboarding_candidates")
      .update(candidateUpdate)
      .eq("id", candidateId)

    if (candidateError) {
      return { ok: false as const, error: candidateError.message }
    }
  }

  if (invitationId) {
    const invitationUpdate = {
      status: completed ? "completed" : "started",
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    const { error: invitationError } = await supabase
      .from("staff_invitations")
      .update(invitationUpdate)
      .eq("id", invitationId)

    if (invitationError) {
      return { ok: false as const, error: invitationError.message }
    }
  }

  const { error: auditError } = await supabase.from("hiring_audit_events").insert({
    employer_entity_type: payload.employer.entityType,
    employer_entity_id: payload.employer.entityId,
    candidate_id: candidateId,
    invitation_id: invitationId,
    actor_id: userId,
    event_type: completed ? "onboarding_submitted" : "onboarding_draft_saved",
    metadata: {
      token,
      template_id: payload.template.id,
      template_source: payload.templateSource,
      response_keys: Object.keys(responses),
    },
    created_at: new Date().toISOString(),
  })

  // Audit should not block onboarding submission while the schema is being normalized.
  if (auditError) console.warn("Failed to write onboarding audit event", auditError.message)

  return { ok: true as const }
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> | { token: string } }) {
  try {
    const rawParams = await context.params
    const params = routeParamsSchema.safeParse(rawParams)

    if (!params.success) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 400 })
    }

    const supabase = createHiringServiceClient()
    const payload = await buildTokenOnboardingPayload({ supabase, token: params.data.token })

    if (!payload) {
      return NextResponse.json({ error: "Onboarding invitation not found" }, { status: 404 })
    }

    return NextResponse.json({ data: payload })
  } catch (error) {
    return NextResponse.json({ error: getReadableError(error) }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> | { token: string } }) {
  try {
    const rawParams = await context.params
    const params = routeParamsSchema.safeParse(rawParams)

    if (!params.success) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 400 })
    }

    const body = await request.json()
    const parsedBody = submitOnboardingSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid onboarding payload",
          issues: parsedBody.error.flatten(),
        },
        { status: 400 }
      )
    }

    const supabase = createHiringServiceClient()
    const payload = await buildTokenOnboardingPayload({ supabase, token: params.data.token })

    if (!payload) {
      return NextResponse.json({ error: "Onboarding invitation not found" }, { status: 404 })
    }

    const requiredBlockingFields = getRequiredBlockingFields(payload)
    const missingBlockingFields = getMissingBlockingFields({
      responses: parsedBody.data.responses,
      requiredBlockingFields,
    })

    if (parsedBody.data.completed && missingBlockingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Required onboarding fields are missing",
          missingFields: missingBlockingFields,
        },
        { status: 422 }
      )
    }

    const saved = await saveOnboardingResponses({
      token: params.data.token,
      payload,
      responses: parsedBody.data.responses,
      completed: parsedBody.data.completed,
    })

    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        status: parsedBody.data.completed ? "submitted" : "draft",
        missingFields: missingBlockingFields,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getReadableError(error) }, { status: 500 })
  }
}
