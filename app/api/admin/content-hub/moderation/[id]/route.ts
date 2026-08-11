import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { assertOrgOwnsPost } from "@/lib/admin/content-hub/org-posts"
import { z } from "zod"

const patchSchema = z.object({
  moderation_status: z.enum(["approved", "pending", "flagged", "removed"]).optional(),
  is_visible: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
})

function extractId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const idx = segments.indexOf("moderation")
  return idx >= 0 ? segments[idx + 1] || null : null
}

export const PATCH = withAdminCapability(
  "content.manage",
  async (request: NextRequest, { supabase, admin }) => {
    const id = extractId(request.url)
    if (!id) return NextResponse.json({ success: false, error: "Missing content id" }, { status: 400 })

    const ownership = await assertOrgOwnsPost({
      supabase,
      postId: id,
      organizerAccountId: admin.profileId,
    })
    if (!ownership.ok) {
      return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.moderation_status !== undefined) {
      updatePayload.moderation_status = parsed.data.moderation_status
    }
    if (parsed.data.is_visible !== undefined) updatePayload.is_visible = parsed.data.is_visible
    if (parsed.data.is_pinned !== undefined) updatePayload.is_pinned = parsed.data.is_pinned

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("posts")
      .update(updatePayload)
      .eq("id", id)
      .eq("posted_as_profile_id", admin.profileId)
      .select("id, moderation_status, is_visible, is_pinned")
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: data })
  },
)
