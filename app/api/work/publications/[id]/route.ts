import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getWorkModeAssignments, WorkModeReadError } from "@/lib/work-mode/read-model"
import type { WorkModeApiResponse, WorkModePublication } from "@/types/hiring-roster-work-mode"

interface WorkPublicationDetail {
  publication: WorkModePublication
  generatedAt: string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkPublicationDetail>>(
      { error: "Sign in to view this work packet.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  try {
    const payload = await getWorkModeAssignments(supabase, user.id)
    const publication = payload.publications.find((item) => item.id === id)
    if (!publication) {
      return NextResponse.json<WorkModeApiResponse<WorkPublicationDetail>>(
        { error: "Work packet not found or no longer available.", code: "not_found" },
        { status: 404 },
      )
    }

    return NextResponse.json<WorkModeApiResponse<WorkPublicationDetail>>(
      { data: { publication, generatedAt: payload.generatedAt } },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    const message =
      error instanceof WorkModeReadError ? error.message : "Work packet is temporarily unavailable."
    return NextResponse.json<WorkModeApiResponse<WorkPublicationDetail>>(
      { error: message, code: "unavailable" },
      { status: 503 },
    )
  }
}
