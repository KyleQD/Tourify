import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  findWorkModeAssignment,
  getWorkModeAssignments,
  WorkModeReadError,
} from "@/lib/work-mode/read-model"
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"

interface WorkModeAssignmentDetail {
  assignment: WorkModeAssignmentListItem
  publications: WorkModePublication[]
  generatedAt: string
  workerActionsAvailable: boolean
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
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentDetail>>(
      { error: "Sign in to view this assignment.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  try {
    const payload = await getWorkModeAssignments(supabase, user.id)
    const assignment = findWorkModeAssignment(payload, id)
    if (!assignment) {
      return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentDetail>>(
        { error: "Assignment not found or no longer available.", code: "not_found" },
        { status: 404 },
      )
    }

    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentDetail>>(
      {
        data: {
          assignment,
          publications: payload.publications.filter(
            (publication) =>
              (assignment.eventId && publication.eventId === assignment.eventId) ||
              (assignment.tourId && publication.tourId === assignment.tourId),
          ),
          generatedAt: payload.generatedAt,
          workerActionsAvailable: payload.workerActionsAvailable,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    const message =
      error instanceof WorkModeReadError ? error.message : "Work Mode is temporarily unavailable."
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentDetail>>(
      { error: message, code: "unavailable" },
      { status: 503 },
    )
  }
}
