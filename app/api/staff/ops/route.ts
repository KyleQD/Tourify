import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getWorkerOpsDashboard } from "@/lib/services/worker-ops.service"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await getWorkerOpsDashboard({ supabase, userId: user.id })
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("[Staff Ops] GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load staff ops" },
      { status: 500 }
    )
  }
}
