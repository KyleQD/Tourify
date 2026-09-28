import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getWorkModeHistory, WorkModeReadError } from "@/lib/work-mode/read-model"
import type { WorkModeApiResponse, WorkModeHistoryPayload } from "@/types/hiring-roster-work-mode"

/**
 * Worker-owned work-history read. The read model scopes every query to the
 * authenticated user id server-side, so this surface can never return another
 * worker's assignments, attendance, or evaluation rows.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkModeHistoryPayload>>(
      { error: "Sign in to view your work history.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  try {
    const data = await getWorkModeHistory(supabase, user.id)
    return NextResponse.json<WorkModeApiResponse<WorkModeHistoryPayload>>(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    const message =
      error instanceof WorkModeReadError ? error.message : "Work history is temporarily unavailable."
    return NextResponse.json<WorkModeApiResponse<WorkModeHistoryPayload>>(
      { error: message, code: "unavailable" },
      { status: 503 },
    )
  }
}