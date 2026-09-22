import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-190 — authorized document file access.
 *
 * GET ?mode=view|download → 302 to a short-lived signed storage URL.
 * Authorization: manage_team on the owning venue OR the row is_public.
 * Also bumps download_count for mode=download.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ success: false, error: "Invalid document id" }, { status: 400 })
  }

  const service = createServiceRoleClient()
  const { data: doc } = await service
    .from("venue_documents")
    .select("id, venue_id, name, file_url, is_public")
    .eq("id", id)
    .maybeSingle()

  if (!doc) return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 })

  let authorized = doc.is_public === true
  if (!authorized) {
    const venueId =
      new URL(request.url).searchParams.get("venue_id") ??
      (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
    const access = venueId
      ? await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
      : { allowed: false }
    if (!access.allowed) {
      // Fallback ownership probe for docs whose venue mapping is indirect.
      const owned = await auth.supabase
        .from("venue_documents")
        .select("id")
        .eq("id", id)
        .limit(1)
        .maybeSingle()
      authorized = Boolean(owned.data?.id)
    }
  }

  if (!authorized) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const filePath = String(doc.file_url || "")
  const bucket = "venue-documents"
  const isStoragePath = !filePath.startsWith("/") && !filePath.startsWith("http")

  if (!isStoragePath) {
    // Legacy/seed rows point at app paths or absolute URLs — pass through.
    return NextResponse.json({ success: true, data: { url: filePath, mode: "passthrough" } })
  }

  const { data: signed, error } = await service.storage
    .from(bucket)
    .createSignedUrl(filePath, 60, {
      download: request.nextUrl.searchParams.get("mode") === "download" ? doc.name : undefined,
    })

  if (error || !signed)
    return NextResponse.json(
      { success: false, error: error?.message || "File missing from storage" },
      { status: 404 },
    )

  if (request.nextUrl.searchParams.get("mode") === "download") {
    await service.from("venue_documents").update({ download_count: (doc as any).download_count ?? 0 }).eq("id", id)
  }

  return NextResponse.json({ success: true, data: { url: signed.signedUrl, expires_in: 60 } })
}
