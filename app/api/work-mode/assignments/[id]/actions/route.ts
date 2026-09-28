import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { Database } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import {
  findWorkModeAssignment,
  getWorkModeAssignments,
  WorkModeReadError,
} from "@/lib/work-mode/read-model"
import type { WorkModeApiResponse } from "@/types/hiring-roster-work-mode"

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["check_in", "check_out"]),
    clientRequestId: z.string().uuid(),
    deviceOccurredAt: z.string().datetime({ offset: true }).nullable().optional(),
  }),
  z.object({
    action: z.literal("acknowledge"),
    publicationId: z.string().uuid(),
    clientRequestId: z.string().uuid(),
  }),
])

interface WorkerActionResult {
  id: string
  action: "check_in" | "check_out" | "acknowledge"
  occurredAt: string
  idempotent: boolean
}

interface WorkerAttendanceEvent {
  id: string
  action: "check_in" | "check_out"
  occurredAt: string
  deviceOccurredAt: string | null
}

type WorkerActionsClient = SupabaseClient<Database> & {
  from(table: "work_mode_check_in_events" | "work_mode_publication_acknowledgements"): any
}

function unavailable() {
  return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
    {
      error:
        "Worker actions are unavailable until the reviewed SQL package is applied and verified.",
      code: "unavailable",
    },
    { status: 503 },
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.FEATURE_WORK_MODE_WORKER_ACTIONS !== "1") return unavailable()

  const { id: assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view attendance.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  try {
    const payload = await getWorkModeAssignments(supabase, user.id)
    const assignment = findWorkModeAssignment(payload, assignmentId)
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found or no longer available.", code: "not_found" },
        { status: 404 },
      )
    }
    const db = supabase as WorkerActionsClient
    const { data, error } = await db
      .from("work_mode_check_in_events")
      .select("id, action, occurred_at, device_occurred_at")
      .eq("assignment_id", assignment.id)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(50)
    if (error) return unavailable()

    const events: WorkerAttendanceEvent[] = (data ?? []).map((row: {
      id: string
      action: "check_in" | "check_out"
      occurred_at: string
      device_occurred_at: string | null
    }) => ({
      id: row.id,
      action: row.action,
      occurredAt: row.occurred_at,
      deviceOccurredAt: row.device_occurred_at,
    }))
    return NextResponse.json(
      { data: events },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    if (!(error instanceof WorkModeReadError)) console.error("[work-mode/actions] attendance read failed", error)
    return unavailable()
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.FEATURE_WORK_MODE_WORKER_ACTIONS !== "1") return unavailable()

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
      { error: "A valid worker action and request id are required.", code: "validation" },
      { status: 422 },
    )
  }

  const { id: assignmentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
      { error: "Sign in to update this assignment.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  try {
    const payload = await getWorkModeAssignments(supabase, user.id)
    const assignment = findWorkModeAssignment(payload, assignmentId)
    if (!assignment) {
      return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
        { error: "Assignment not found or no longer available.", code: "not_found" },
        { status: 404 },
      )
    }
    if (assignment.status !== "confirmed" && assignment.status !== "active") {
      return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
        { error: "Accept the assignment before recording worker actions.", code: "conflict" },
        { status: 409 },
      )
    }

    const db = supabase as WorkerActionsClient
    const input = parsed.data
    if (input.action === "acknowledge") {
      const publication = payload.publications.find(
        (item) =>
          item.id === input.publicationId &&
          ((item.eventId !== null && item.eventId === assignment.eventId) ||
            (item.tourId !== null && item.tourId === assignment.tourId)),
      )
      if (!publication) {
        return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
          { error: "Published packet not found for this assignment.", code: "not_found" },
          { status: 404 },
        )
      }

      const occurredAt = new Date().toISOString()
      const { data, error } = await db
        .from("work_mode_publication_acknowledgements")
        .insert({
          assignment_id: assignment.id,
          publication_id: publication.id,
          user_id: user.id,
          acknowledged_at: occurredAt,
          client_request_id: input.clientRequestId,
        })
        .select("id, acknowledged_at")
        .single()

      if (error?.code === "23505") {
        const { data: existing } = await db
          .from("work_mode_publication_acknowledgements")
          .select("id, assignment_id, publication_id, acknowledged_at")
          .eq("user_id", user.id)
          .eq("client_request_id", input.clientRequestId)
          .maybeSingle()
        if (
          existing?.assignment_id === assignment.id &&
          existing.publication_id === publication.id
        ) {
          return NextResponse.json({
            data: {
              id: existing.id,
              action: "acknowledge",
              occurredAt: existing.acknowledged_at,
              idempotent: true,
            },
          })
        }
        return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
          { error: "This packet was already acknowledged.", code: "conflict" },
          { status: 409 },
        )
      }
      if (error || !data) return unavailable()

      return NextResponse.json({
        data: {
          id: data.id,
          action: "acknowledge",
          occurredAt: data.acknowledged_at,
          idempotent: false,
        },
      })
    }

    if (!assignment.permissions.check_in_out) {
      return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
        { error: "Your assignment does not include check-in access.", code: "forbidden" },
        { status: 403 },
      )
    }

    const occurredAt = new Date().toISOString()
    const { data, error } = await db
      .from("work_mode_check_in_events")
      .insert({
        assignment_id: assignment.id,
        user_id: user.id,
        event_id: assignment.eventId,
        action: input.action,
        occurred_at: occurredAt,
        device_occurred_at: input.deviceOccurredAt ?? null,
        client_request_id: input.clientRequestId,
        context: {},
      })
      .select("id, action, occurred_at")
      .single()

    if (error?.code === "23505") {
      const { data: existing } = await db
        .from("work_mode_check_in_events")
        .select("id, assignment_id, action, occurred_at")
        .eq("user_id", user.id)
        .eq("client_request_id", input.clientRequestId)
        .maybeSingle()
      if (existing?.assignment_id === assignment.id && existing.action === input.action) {
        return NextResponse.json({
          data: {
            id: existing.id,
            action: existing.action,
            occurredAt: existing.occurred_at,
            idempotent: true,
          },
        })
      }
      return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
        { error: "This request id was already used for another worker action.", code: "conflict" },
        { status: 409 },
      )
    }
    if (error || !data) return unavailable()

    return NextResponse.json({
      data: {
        id: data.id,
        action: data.action,
        occurredAt: data.occurred_at,
        idempotent: false,
      },
    })
  } catch (error) {
    if (error instanceof WorkModeReadError) return unavailable()
    console.error("[work-mode/actions] unexpected failure", error)
    return unavailable()
  }
}
