import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getWorkHub } from "@/lib/work-hub/read-model"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "not_authenticated" },
        { status: 401 },
      )
    }

    const data = await getWorkHub({ supabase, userId: user.id })
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    console.error("[work-hub] read failed", error)
    return NextResponse.json(
      { success: false, error: "Your Work Hub is temporarily unavailable", code: "unavailable" },
      { status: 503 },
    )
  }
}

