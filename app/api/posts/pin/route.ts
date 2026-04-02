import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

interface TogglePostPinBody {
  postId: string
  isPinned: boolean
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: TogglePostPinBody
  try {
    body = (await request.json()) as TogglePostPinBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body?.postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 })

  const { data: postRow, error: postError } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", body.postId)
    .single()

  if (postError || !postRow) return NextResponse.json({ error: "Post not found" }, { status: 404 })
  if (postRow.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error: updateError } = await supabase
    .from("posts")
    .update({ is_pinned: Boolean(body.isPinned) })
    .eq("id", body.postId)
    .eq("user_id", userId)

  if (updateError) {
    console.error("Error toggling post pin:", updateError)
    return NextResponse.json({ error: "Failed to update pin state" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

