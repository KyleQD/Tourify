import { NextResponse } from "next/server"
import { z } from "zod"

import { hiringResultToResponse } from "@/lib/api/hiring-route-helpers"
import { createClient } from "@/lib/supabase/server"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { buildTokenOnboardingPayload } from "@/lib/services/token-onboarding-payload.service"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"
import {
  hasPersonalInfoAttestation,
  PERSONAL_INFO_ATTESTATION_FIELD,
  withAttestationTimestamp,
} from "@/lib/hiring/onboarding-step-groups"

const routeParamsSchema = z.object({
  token: z.string().min(8, "Invalid onboarding token"),
})

const submitOnboardingSchema = z.object({
  responses: z.record(z.unknown()),
  completed: z.boolean().default(true),
})

function getReadableError(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unexpected onboarding error"
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function getRequiredFields(payload: NonNullable<Awaited<ReturnType<typeof buildTokenOnboardingPayload>>>): string[] {
  return payload.template.fields
    .filter((field) => field.required || field.blocking)
    .map((field) => field.name)
}

function isResponseValueComplete(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return value === true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    if ("fileName" in record || "document_id" in record || "url" in record || "storagePath" in record) {
      return Boolean(record.fileName || record.document_id || record.url || record.storagePath)
    }
    return Object.values(record).some(Boolean)
  }
  return false
}

function getMissingRequiredFields({
  responses,
  requiredFields,
}: {
  responses: Record<string, unknown>
  requiredFields: string[]
}): string[] {
  return requiredFields.filter((fieldName) => !isResponseValueComplete(responses[fieldName]))
}

async function sendCompletionNotifications({
  supabase,
  payload,
  staffMemberId,
  venueId,
  onboardingResponseId,
}: {
  supabase: ReturnType<typeof createHiringServiceClient>
  payload: NonNullable<Awaited<ReturnType<typeof buildTokenOnboardingPayload>>>
  staffMemberId: string | null
  venueId: string | null
  onboardingResponseId?: string
}) {
  const userId =
    readString(payload.candidate, "user_id") ??
    readString(payload.candidate, "applicant_id") ??
    readString(payload.invitation, "user_id")

  if (userId) {
    try {
      await OptimizedNotificationService.createNotification({
        userId,
        type: "onboarding_completed",
        title: "Onboarding complete!",
        content: "Your onboarding is complete. Welcome to the team!",
        metadata: {
          invitation_id: readString(payload.invitation, "id"),
          staff_member_id: staffMemberId,
          venue_id: venueId,
        },
      })
    } catch {
      // non-blocking
    }
  }

  await supabase
    .from("notifications")
    .insert({
      type: "onboarding_completed",
      content: `${readString(payload.invitation, "email") ?? "A worker"} has completed onboarding.`,
      metadata: {
        invitationId: readString(payload.invitation, "id"),
        userId,
        onboardingId: onboardingResponseId,
        staff_member_id: staffMemberId,
      },
      created_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) console.error("Failed to create legacy notification:", error)
    })
}

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = routeParamsSchema.safeParse(await context.params)

    if (!params.success) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 400 })
    }

    // Session user gates vault decrypt for sensitive prefill — never decrypt for anonymous/mismatched users.
    const authClient = await createClient()
    const {
      data: { user: sessionUser },
    } = await authClient.auth.getUser()

    const supabase = createHiringServiceClient()
    const payload = await buildTokenOnboardingPayload({
      supabase,
      token: params.data.token,
      sessionUserId: sessionUser?.id ?? null,
    })

    if (!payload) {
      return NextResponse.json({ error: "Onboarding invitation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    console.error("Error fetching onboarding data:", error)
    return NextResponse.json({ error: getReadableError(error) }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = routeParamsSchema.safeParse(await context.params)

    if (!params.success) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 400 })
    }

    const body = await request.json()
    const parsedBody = submitOnboardingSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedBody.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createHiringServiceClient()
    const payload = await buildTokenOnboardingPayload({ supabase, token: params.data.token })

    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
    }

    const requiredFields = getRequiredFields(payload)
    const missingRequiredFields = getMissingRequiredFields({
      responses: parsedBody.data.responses,
      requiredFields,
    })

    if (parsedBody.data.completed && missingRequiredFields.length > 0) {
      return NextResponse.json(
        { error: "Required onboarding fields are missing", missingFields: missingRequiredFields },
        { status: 422 }
      )
    }

    // Platform legal control: accuracy/ownership + employer sharing consent (not a template field).
    if (parsedBody.data.completed && !hasPersonalInfoAttestation(parsedBody.data.responses)) {
      return NextResponse.json(
        {
          error: "Personal information certification is required before completing onboarding",
          missingFields: [PERSONAL_INFO_ATTESTATION_FIELD],
        },
        { status: 422 }
      )
    }

    const responses = parsedBody.data.completed
      ? withAttestationTimestamp(parsedBody.data.responses)
      : parsedBody.data.responses

    const invitationId = readString(payload.invitation, "id")
    const candidateId = readString(payload.candidate, "id")
    const userId =
      readString(payload.candidate, "user_id") ??
      readString(payload.candidate, "applicant_id") ??
      readString(payload.invitation, "user_id")

    // Prefer candidate_id (matches service); fall back to invitation_id for legacy rows.
    let existingOnboarding: { id?: string; completed_at?: string | null } | null = null
    if (candidateId) {
      const byCandidate = await supabase
        .from("onboarding_responses")
        .select("id, completed_at")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      existingOnboarding = byCandidate.data
    }
    if (!existingOnboarding && invitationId) {
      const byInvitation = await supabase
        .from("onboarding_responses")
        .select("id, completed_at")
        .eq("invitation_id", invitationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      existingOnboarding = byInvitation.data
    }

    const candidateProgress = Number(payload.progress ?? 0)
    const candidateStatus = readString(payload.candidate, "status")
    const invitationStatus = readString(payload.invitation, "status")
    const isRevisionResubmit = candidateStatus === "needs_revision"
    const alreadySubmitted =
      parsedBody.data.completed &&
      !isRevisionResubmit &&
      (Boolean(existingOnboarding?.completed_at) ||
        invitationStatus === "completed" ||
        candidateStatus === "submitted" ||
        candidateStatus === "completed" ||
        candidateProgress >= 100)

    if (alreadySubmitted) {
      return NextResponse.json({
        success: true,
        data: {
          ...(existingOnboarding ?? {}),
          alreadySubmitted: true,
          status: "submitted",
        },
      })
    }

    const result = await HiringOnboardingService.submitTokenOnboarding({
      supabase,
      token: params.data.token,
      responses,
      completedByUserId: userId ?? undefined,
      completed: parsedBody.data.completed,
    })

    if (!result.ok) {
      return hiringResultToResponse(result)
    }

    const staffMember = result.data.staffMember as Record<string, unknown> | null
    const staffMemberId = staffMember?.id ? String(staffMember.id) : null
    const venueId =
      readString(payload.candidate, "venue_id") ??
      (payload.employer.entityType === "venue" ? payload.employer.entityId : null)

    if (parsedBody.data.completed && !result.data.alreadySubmitted) {
      await sendCompletionNotifications({
        supabase,
        payload,
        staffMemberId,
        venueId,
        onboardingResponseId: (result.data.response as Record<string, unknown> | undefined)?.id
          ? String((result.data.response as Record<string, unknown>).id)
          : undefined,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...(result.data.response as Record<string, unknown>),
        staff_member_id: staffMemberId,
        employment_assignment_id: (result.data.employmentAssignment as Record<string, unknown> | undefined)?.id ?? null,
        status: parsedBody.data.completed ? "submitted" : "draft",
        alreadySubmitted: Boolean(result.data.alreadySubmitted),
        warnings: Array.isArray(result.data.warnings) ? result.data.warnings : [],
      },
    })
  } catch (error) {
    console.error("Error processing onboarding:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to process onboarding" }, { status: 500 })
  }
}
