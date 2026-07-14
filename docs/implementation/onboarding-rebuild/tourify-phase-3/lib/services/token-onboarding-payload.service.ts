import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveOnboardingTemplate } from "@/lib/services/onboarding-template-resolver.service"
import type { HiringEntity } from "@/types/hiring-entity"
import type { TokenOnboardingPayload } from "@/types/onboarding-template-resolver"

interface TokenLookupArgs {
  supabase: SupabaseClient
  token: string
}

interface CandidateLookupArgs {
  supabase: SupabaseClient
  invitation: Record<string, unknown>
}

interface JobLookupArgs {
  supabase: SupabaseClient
  candidate: Record<string, unknown>
}

interface ExistingResponsesArgs {
  supabase: SupabaseClient
  candidate: Record<string, unknown>
  invitation: Record<string, unknown>
}

interface BuildTokenOnboardingPayloadArgs {
  supabase: SupabaseClient
  token: string
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

async function findInvitationByToken({ supabase, token }: TokenLookupArgs): Promise<Record<string, unknown> | null> {
  const tokenQuery = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle()

  if (tokenQuery.data && !tokenQuery.error) return tokenQuery.data as Record<string, unknown>

  const legacyTokenQuery = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("invitation_token", token)
    .maybeSingle()

  if (legacyTokenQuery.data && !legacyTokenQuery.error) return legacyTokenQuery.data as Record<string, unknown>

  return null
}

async function findCandidateForInvitation({
  supabase,
  invitation,
}: CandidateLookupArgs): Promise<Record<string, unknown> | null> {
  const candidateId = readString(invitation, "candidate_id")
  const token = readString(invitation, "token") ?? readString(invitation, "invitation_token")

  if (candidateId) {
    const { data, error } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("id", candidateId)
      .maybeSingle()

    if (data && !error) return data as Record<string, unknown>
  }

  if (token) {
    const { data, error } = await supabase
      .from("staff_onboarding_candidates")
      .select("*")
      .eq("invitation_token", token)
      .maybeSingle()

    if (data && !error) return data as Record<string, unknown>
  }

  return null
}

async function findJobForCandidate({ supabase, candidate }: JobLookupArgs): Promise<Record<string, unknown> | null> {
  const jobPostingId = readString(candidate, "job_posting_id")
  if (!jobPostingId) return null

  const { data, error } = await supabase
    .from("job_posting_templates")
    .select("*")
    .eq("id", jobPostingId)
    .maybeSingle()

  if (error || !data) return null
  return data as Record<string, unknown>
}

function deriveEmployer({
  invitation,
  candidate,
  job,
}: {
  invitation: Record<string, unknown>
  candidate: Record<string, unknown>
  job: Record<string, unknown> | null
}): HiringEntity | null {
  const sources = [candidate, invitation, job ?? {}]

  for (const source of sources) {
    const entityType = readString(source, "employer_entity_type")
    const entityId = readString(source, "employer_entity_id")

    if ((entityType === "venue" || entityType === "organization" || entityType === "artist") && entityId) {
      return {
        entityType,
        entityId,
        displayName:
          readString(source, "employer_display_name") ??
          readString(job ?? {}, "employer_display_name") ??
          readString(job ?? {}, "venue_name") ??
          "Hiring Team",
        scope: {
          eventId: readString(source, "event_id") ?? readString(job ?? {}, "event_id") ?? undefined,
          tourId: readString(source, "tour_id") ?? readString(job ?? {}, "tour_id") ?? undefined,
          venueId: readString(source, "venue_id") ?? readString(job ?? {}, "venue_id") ?? undefined,
        },
      }
    }
  }

  const legacyVenueId = readString(candidate, "venue_id") ?? readString(invitation, "venue_id") ?? readString(job ?? {}, "venue_id")

  if (!legacyVenueId) return null

  return {
    entityType: "venue",
    entityId: legacyVenueId,
    displayName: readString(job ?? {}, "venue_name") ?? "Hiring Venue",
    scope: {
      eventId: readString(candidate, "event_id") ?? readString(job ?? {}, "event_id") ?? undefined,
      tourId: readString(candidate, "tour_id") ?? readString(job ?? {}, "tour_id") ?? undefined,
      venueId: legacyVenueId,
    },
  }
}

async function findExistingResponses({
  supabase,
  candidate,
  invitation,
}: ExistingResponsesArgs): Promise<Record<string, unknown> | null> {
  const candidateId = readString(candidate, "id")
  const invitationId = readString(invitation, "id")

  let query = supabase
    .from("onboarding_responses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)

  if (candidateId) query = query.eq("candidate_id", candidateId)
  else if (invitationId) query = query.eq("invitation_id", invitationId)
  else return null

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  return data as Record<string, unknown>
}

export async function buildTokenOnboardingPayload({
  supabase,
  token,
}: BuildTokenOnboardingPayloadArgs): Promise<TokenOnboardingPayload | null> {
  const invitation = await findInvitationByToken({ supabase, token })
  if (!invitation) return null

  const candidate = await findCandidateForInvitation({ supabase, invitation })
  if (!candidate) return null

  const job = await findJobForCandidate({ supabase, candidate })
  const employer = deriveEmployer({ invitation, candidate, job })
  if (!employer) return null

  const position =
    readString(candidate, "position") ?? readString(invitation, "position") ?? readString(job ?? {}, "position") ?? null
  const department =
    readString(candidate, "department") ?? readString(invitation, "department") ?? readString(job ?? {}, "department") ?? null
  const templateId =
    readString(invitation, "template_id") ??
    readString(candidate, "template_id") ??
    readString(job ?? {}, "onboarding_template_id") ??
    null

  const resolved = await resolveOnboardingTemplate({
    supabase,
    employer,
    position,
    department,
    templateId,
    flowType: "onboarding",
  })

  const existingResponses = await findExistingResponses({ supabase, candidate, invitation })

  return {
    token,
    invitation,
    candidate,
    employer,
    position,
    department,
    template: resolved.template,
    templateSource: resolved.source,
    existingResponses,
    progress: readNumber(candidate, "onboarding_progress") ?? 0,
  }
}
