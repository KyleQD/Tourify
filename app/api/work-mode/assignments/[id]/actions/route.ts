import { NextResponse } from "next/server"
import { z } from "zod"

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

type WorkerActionsClient = { from(table: string): any }

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

    const db = supabase as unknown as WorkerActionsClient
    const input = parsed.data
    if (input.action === "acknowledge") {
      const publication = payload.publications.find(
        (item) =>
          item.id === input.publicationId &&
          item.eventId === assignment.eventId,
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
          .select("id, acknowledged_at")
          .eq("user_id", user.id)
          .eq("client_request_id", input.clientRequestId)
          .maybeSingle()
        if (existing) {
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

    if (input.action === "check_in" && assignment.attendance.state !== "not_checked_in") {
      return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
        { error: "Check-in has already been recorded for this assignment.", code: "conflict" },
        { status: 409 },
      )
    }
    if (input.action === "check_out" && assignment.attendance.state !== "checked_in") {
      return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
        { error: "Check in before recording check-out for this assignment.", code: "conflict" },
        { status: 409 },
      )
    }

    // Check-in policy belongs to the scheduled shift. Null policy timestamps deliberately
    // mean no additional time restriction, preserving existing confirmed assignments.
    const { data: assignmentRow, error: assignmentLookupError } = await db
      .from("employment_assignments")
      .select("staff_shift_id")
      .eq("id", assignment.id)
      .eq("user_id", user.id)
      .maybeSingle()
    if (assignmentLookupError || !assignmentRow) return unavailable()

    if (assignmentRow.staff_shift_id) {
      const { data: shift, error: shiftError } = await db
        .from("staff_shifts")
        .select("check_in_opens_at, check_in_closes_at, check_out_opens_at")
        .eq("id", assignmentRow.staff_shift_id)
        .maybeSingle()
      if (shiftError || !shift) return unavailable()

      const now = Date.now()
      const opensAt = shift.check_in_opens_at ? Date.parse(shift.check_in_opens_at) : null
      const closesAt = shift.check_in_closes_at ? Date.parse(shift.check_in_closes_at) : null
      const checkOutOpensAt = shift.check_out_opens_at ? Date.parse(shift.check_out_opens_at) : null
      if (input.action === "check_in" && opensAt !== null && now < opensAt) {
        return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
          { error: "Check-in is not available yet for this shift.", code: "conflict" },
          { status: 409 },
        )
      }
      if (input.action === "check_in" && closesAt !== null && now > closesAt) {
        return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
          { error: "The check-in window has closed. Contact your supervisor for help.", code: "conflict" },
          { status: 409 },
        )
      }
      if (input.action === "check_out" && checkOutOpensAt !== null && now < checkOutOpensAt) {
        return NextResponse.json<WorkModeApiResponse<WorkerActionResult>>(
          { error: "Check-out is not available yet for this shift.", code: "conflict" },
          { status: 409 },
        )
      }
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
        .select("id, action, occurred_at")
        .eq("user_id", user.id)
        .eq("client_request_id", input.clientRequestId)
        .maybeSingle()
      if (existing) {
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
        { error: `${input.action === "check_in" ? "Check-in" : "Check-out"} has already been recorded for this assignment.`, code: "conflict" },
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
