import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveActingContext } from "@/lib/auth/acting-context"
import { setDefaultStyleProfile } from "@/lib/post-style-profiles/profiles.service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, accountType, profileId, supabase } = ctx
  const ownerId = profileId ?? userId
  const { id } = await params

  try {
    await setDefaultStyleProfile(supabase, id, userId, accountType, ownerId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to set default"
    const status =
      msg.includes("unauthorized") || msg.includes("not found")
        ? 403
        : msg.includes("legacy") || msg.includes("archived")
          ? 400
          : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
