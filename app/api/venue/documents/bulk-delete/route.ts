import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-190 — real bulk delete: removes the storage object (when the row's
 * file_url is a bucket path) and the metadata row. Owner-scoped per document.
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return NextResponse.json({ success: false, error: "ids must be a non-empty array (max 100)" }, { status: 400 })
  }
  if (!ids.every((v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v))) {
    return NextResponse.json({ success: false, error: "Invalid document ids" }, { status: 400 })
  }

  const service = createServiceRoleClient()
  const { data: docs } = await service
    .from("venue_documents")
    .select("id, venue_id, name, file_url")
    .in("id", ids as string[])

  const deleted: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const doc of docs ?? []) {
    const venueId = doc.venue_id
    const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
    if (!access.allowed) {
      failed.push({ id: doc.id, error: "Forbidden" })
      continue
    }

    const filePath = String(doc.file_url || "")
    // Only remove storage objects for real bucket paths.
    if (filePath && !filePath.startsWith("/") && !filePath.startsWith("http")) {
      const { error: storageError } = await service.storage.from("venue-documents").remove([filePath])
      if (storageError) console.warn("[documents] storage remove failed:", storageError.message)
    }

    const { error } = await service.from("venue_documents").delete().eq("id", doc.id)
    if (error) failed.push({ id: doc.id, error: error.message })
    else deleted.push(doc.id)
  }

  return NextResponse.json({ success: failed.length === 0, deleted, failed })
}
