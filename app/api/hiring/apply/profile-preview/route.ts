import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { buildProfileSnapshot, validateSnapshotCompleteness } from "@/lib/services/applicant-profile-snapshot.service"
import { getScreeningFields } from "@/lib/hiring/quick-apply-fields"
import type { ApplicationFormField } from "@/types/admin-onboarding"

/**
 * Quick Apply preview: returns the profile snapshot the applicant would share
 * with the hiring party plus only the employer-specific screening questions they
 * still need to answer. Read-only; nothing is persisted here.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const jobPostingId = request.nextUrl.searchParams.get("job_posting_id")
    if (!jobPostingId) {
      return NextResponse.json({ success: false, error: "job_posting_id is required" }, { status: 400 })
    }

    const { data: jobPosting, error: jobError } = await supabase
      .from("job_posting_templates")
      .select("id, title, status, application_form_template")
      .eq("id", jobPostingId)
      .maybeSingle()

    if (jobError) {
      console.error("[quick-apply preview]", jobError)
      return NextResponse.json({ success: false, error: "Failed to load job posting" }, { status: 500 })
    }

    if (!jobPosting) {
      return NextResponse.json({ success: false, error: "This job posting no longer exists." }, { status: 404 })
    }

    const fields = (jobPosting.application_form_template as { fields?: ApplicationFormField[] } | null)?.fields

    const screeningFields = getScreeningFields(fields)

    const snapshot = await buildProfileSnapshot({
      supabase,
      userId: user.id,
      authEmail: user.email,
      shareContact: true,
    })

    const completeness = validateSnapshotCompleteness(snapshot)

    // Surface whether the applicant already applied recently so the UI can guard.
    const { data: existing } = await supabase
      .from("job_applications")
      .select("id, applied_at, status")
      .eq("job_posting_id", jobPostingId)
      .eq("applicant_id", user.id)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        snapshot,
        screeningFields,
        completeness,
        alreadyApplied: Boolean(existing),
        existingApplication: existing ?? null,
      },
    })
  } catch (error) {
    console.error("[quick-apply preview]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
