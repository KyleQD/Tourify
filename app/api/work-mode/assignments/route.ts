import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getWorkModeAssignments, WorkModeReadError } from "@/lib/work-mode/read-model"
import type {
  WorkModeApiResponse,
  WorkModeAssignmentsPayload,
} from "@/types/hiring-roster-work-mode"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { error: "Sign in to view Work Mode.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  try {
    const data = await getWorkModeAssignments(supabase, user.id)
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    const message =
      error instanceof WorkModeReadError
        ? error.message
        : "Work Mode is temporarily unavailable."

    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { error: message, code: "unavailable" },
      { status: 503 },
    )
  }
}
