import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveActingContext } from "@/lib/auth/acting-context"
import { resolveAppearanceSnapshot } from "@/lib/post-style-profiles/appearance-snapshot.service"
import { resolvePostStyleFlags } from "@/lib/post-style-flags"

export async function POST(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, accountType, profileId, supabase } = ctx

  const flags = await resolvePostStyleFlags(supabase, userId)
  if (!flags.post_styles_editor) {
    return NextResponse.json({ error: "Not enabled" }, { status: 403 })
  }

  // Size limit: reject bodies over 16 kB
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > 16384) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 })
  }

  const body = await request.json()
  const { appearance: input } = body

  if (!input || input.mode === "standard") {
    return NextResponse.json({ appearance: { mode: "standard" } })
  }

  try {
    const snapshot = await resolveAppearanceSnapshot(input, supabase, userId, {
      type: accountType,
      id: profileId ?? userId,
    })
    return NextResponse.json({
      appearance: {
        mode: "styled",
        templateId: snapshot.templateId,
        templateVersion: snapshot.templateVersion,
        schemaVersion: snapshot.schemaVersion,
        snapshot,
      },
    })
  } catch (error) {
    const reason =
      error instanceof Error && "reason" in error
        ? (error as { reason: string }).reason
        : "renderer_error"
    return NextResponse.json({ appearance: { mode: "standard", fallbackReason: reason } })
  }
}
