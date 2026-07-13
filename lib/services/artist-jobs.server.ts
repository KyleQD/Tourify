import "server-only"

import { getPostgrestErrorMessage } from "@/lib/supabase/postgrest-error"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ArtistJobApplication, CreateApplicationFormData } from "@/types/artist-jobs"

export async function applyToArtistJob(
  applicationData: CreateApplicationFormData,
  userId: string
): Promise<ArtistJobApplication> {
  const db = createServiceRoleClient()
  const artistProfileId = (applicationData as { artist_profile_id?: string }).artist_profile_id

  const { data, error } = await db
    .from("artist_job_applications")
    .insert({
      job_id: applicationData.job_id,
      applicant_id: userId,
      contact_email: applicationData.contact_email,
      contact_phone: applicationData.contact_phone ?? null,
      preferred_contact_method: applicationData.preferred_contact_method ?? "email",
      cover_letter: applicationData.cover_letter ?? null,
      portfolio_links: applicationData.portfolio_links ?? [],
      experience_description: applicationData.experience_description ?? null,
      availability_notes: applicationData.availability_notes ?? null,
      resume_url: applicationData.resume_url ?? null,
      demo_reel_url: applicationData.demo_reel_url ?? null,
      additional_files: applicationData.additional_files ?? [],
      ...(artistProfileId ? { artist_profile_id: artistProfileId } : {}),
    })
    .select("*")
    .single()

  if (error) {
    console.error("Error applying to job:", error)
    throw new Error(getPostgrestErrorMessage(error) || "Failed to apply to job")
  }

  return data as ArtistJobApplication
}
