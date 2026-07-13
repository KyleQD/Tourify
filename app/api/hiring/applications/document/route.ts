import { NextRequest, NextResponse } from "next/server"

import { canReviewApplications } from "@/lib/auth/hiring-permissions"
import { resolveEmployerFromApplicationRow } from "@/lib/hiring/resolve-employer-from-application"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const BUCKET = "application-documents"
const SIGNED_URL_TTL_SECONDS = 60 * 10

function isSafeStoragePath(path: string) {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("..") &&
    path.split("/").every(Boolean)
  )
}

function responseContainsPath(value: unknown, storagePath: string): boolean {
  if (!value) return false
  if (typeof value === "string") return value === storagePath
  if (Array.isArray(value)) return value.some((entry) => responseContainsPath(entry, storagePath))
  if (typeof value !== "object") return false

  return Object.values(value as Record<string, unknown>).some((entry) =>
    responseContainsPath(entry, storagePath)
  )
}

export async function GET(request: NextRequest) {
  const storagePath = request.nextUrl.searchParams.get("path") || ""
  const applicationId = request.nextUrl.searchParams.get("application_id")

  if (!isSafeStoragePath(storagePath)) {
    return NextResponse.json({ error: "Invalid document path" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isApplicantOwner = storagePath.startsWith(`${user.id}/`)
  let isAuthorizedReviewer = false

  if (!isApplicantOwner && applicationId) {
    const serviceSupabase = createServiceRoleClient()
    const { data: application, error } = await serviceSupabase
      .from("job_applications")
      .select("id, applicant_id, venue_id, employer_entity_type, employer_entity_id, form_responses")
      .eq("id", applicationId)
      .maybeSingle()

    if (error) {
      console.error("[application document] failed to load application", error)
      return NextResponse.json({ error: "Unable to verify document access" }, { status: 500 })
    }

    if (application && responseContainsPath(application.form_responses, storagePath)) {
      const employer = resolveEmployerFromApplicationRow(application as Record<string, unknown>)
      if (employer) {
        const permission = await canReviewApplications({
          supabase,
          userId: user.id,
          employer,
        })
        isAuthorizedReviewer = permission.ok && permission.data.allowed
      }
    }
  }

  if (!isApplicantOwner && !isAuthorizedReviewer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const serviceSupabase = createServiceRoleClient()
  const { data, error } = await serviceSupabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    console.error("[application document] failed to create signed URL", error)
    return NextResponse.json({ error: "Unable to open document" }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
