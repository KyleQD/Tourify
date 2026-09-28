import { NextResponse } from "next/server"

import { validateAccountSlug } from "@/lib/accounts/account-slug"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to check an account URL.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  const candidate = new URL(request.url).searchParams.get("slug") ?? ""
  const validation = validateAccountSlug(candidate)
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      slug: validation.slug,
      reason: validation.reason,
      message:
        validation.reason === "reserved"
          ? "This URL is reserved."
          : "Use at least three letters or numbers.",
    })
  }

  const trusted = createServiceRoleClient()
  const [organizerResponse, organizationResponse] = await Promise.all([
    trusted
      .from("organizer_accounts")
      .select("id", { count: "exact", head: true })
      .eq("url_slug", validation.slug),
    trusted
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("slug", validation.slug),
  ])

  if (organizerResponse.error || organizationResponse.error) {
    console.error(
      "[accounts/check-slug] availability read failed",
      organizerResponse.error?.message ?? organizationResponse.error?.message,
    )
    return NextResponse.json(
      {
        error: "URL availability is temporarily unavailable.",
        code: "unavailable",
      },
      { status: 503 },
    )
  }

  const available =
    (organizerResponse.count ?? 0) === 0 &&
    (organizationResponse.count ?? 0) === 0
  return NextResponse.json(
    {
      available,
      slug: validation.slug,
      reason: available ? "available" : "taken",
      message: available ? "URL is available." : "This URL is already in use.",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
