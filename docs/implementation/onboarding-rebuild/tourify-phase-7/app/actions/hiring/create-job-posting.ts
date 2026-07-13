"use server"

import { revalidatePath } from "next/cache"

import { createJobPostingActionSchema } from "@/lib/hiring/job-posting-builder-schema"
import { resolveHiringEntity } from "@/lib/auth/acting-context"
import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"
import type { HiringServiceResult } from "@/types/hiring-service"
import { fail } from "@/types/hiring-service"

/**
 * Phase 7 server action adapter.
 *
 * Cursor should merge `getServerSupabaseClient()` and `getCurrentUserId()` with the
 * repo's existing Supabase server/cookie helper. This file keeps all validation in
 * Zod and delegates writes to HiringOnboardingService so the API and action paths
 * share the same business rules.
 *
 * If the repo already uses next-safe-action, wrap the body of this function with the
 * existing actionClient.schema(createJobPostingActionSchema).action(...) helper.
 */
async function getServerSupabaseClient(): Promise<any> {
  try {
    const module = await import("@/lib/supabase/server")
    if (typeof module.createClient === "function") return module.createClient()
    if (typeof module.createServerClient === "function") return module.createServerClient()
    if (typeof module.createServerSupabaseClient === "function") return module.createServerSupabaseClient()
  } catch {
    // Fall through to clear error below.
  }

  throw new Error("Merge getServerSupabaseClient() with Tourify's existing Supabase server helper.")
}

async function getCurrentUserId(supabase: any): Promise<HiringServiceResult<string>> {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user?.id) {
    return fail({ code: "UNAUTHORIZED", message: "You must be signed in to create a job posting.", details: error })
  }

  return { ok: true, data: data.user.id }
}

export async function createJobPostingAction(input: unknown): Promise<HiringServiceResult<Record<string, unknown>>> {
  const parsed = createJobPostingActionSchema.safeParse(input)

  if (!parsed.success) {
    return fail({
      code: "VALIDATION_ERROR",
      message: "Job posting data is invalid.",
      details: parsed.error.flatten(),
    })
  }

  const supabase = await getServerSupabaseClient()
  const userResult = await getCurrentUserId(supabase)
  if (!userResult.ok) return userResult

  const employerResult = await resolveHiringEntity({
    supabase,
    userId: userResult.data,
    entityType: parsed.data.employer_entity_type,
    entityId: parsed.data.employer_entity_id,
    venueId: parsed.data.venue_id ?? undefined,
    eventId: parsed.data.event_id ?? undefined,
    tourId: parsed.data.tour_id ?? undefined,
    requirePermission: true,
  })

  if (!employerResult.ok) return employerResult

  const result = await HiringOnboardingService.createJobPosting({
    supabase,
    actor: {
      userId: userResult.data,
      employer: employerResult.data,
    },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      department: parsed.data.department,
      position: parsed.data.position,
      employment_type: parsed.data.employment_type,
      location: parsed.data.location,
      role_type: parsed.data.role_type,
      number_of_positions: parsed.data.number_of_positions,
      salary_range: parsed.data.salary_range ?? null,
      requirements: parsed.data.requirements,
      responsibilities: parsed.data.responsibilities,
      benefits: parsed.data.benefits,
      skills: parsed.data.skills,
      experience_level: parsed.data.experience_level,
      remote: parsed.data.remote,
      urgent: parsed.data.urgent,
      required_certifications: parsed.data.required_certifications,
      application_form_template: parsed.data.application_form_template,
      onboarding_template_id: parsed.data.onboarding_template_id || null,
      status: parsed.data.status,
    },
  })

  if (result.ok) {
    revalidatePath("/admin/dashboard/jobs")
    revalidatePath("/admin/dashboard/staff")
    revalidatePath("/venue/staff")
    revalidatePath("/artist/team")
  }

  return result
}
