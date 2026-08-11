/**
 * PLAN-105 / EVENT-103 — Explicit reviewed provisioning for staff shifts + ticket inventory.
 * Never invents capacity or shifts from builder defaults. Returns exact changes/failures.
 */

import { z } from "zod"

import { AdminTourEventOperationsService } from "@/lib/admin/tour-event-operations.service"
import { buildEventSetupChecklist } from "@/lib/admin/event-setup-checklist"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export const provisionStaffShiftSchema = z.object({
  staff_member_id: z.string().uuid(),
  shift_date: z.string().min(8).max(40),
  start_time: z.string().min(4).max(16),
  end_time: z.string().min(4).max(16),
  role_assignment: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const provisionTicketTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().nonnegative(),
  quantity_available: z.number().int().positive(),
  category: z.string().trim().max(64).optional(),
})

export const provisionEventOperationsSchema = z.object({
  /** Caller must acknowledge review of generated operational rows. */
  reviewed: z.literal(true),
  staff_shifts: z.array(provisionStaffShiftSchema).max(200).optional().default([]),
  ticket_types: z.array(provisionTicketTypeSchema).max(50).optional().default([]),
})

export type ProvisionEventOperationsInput = z.input<typeof provisionEventOperationsSchema>

export interface ProvisionChange {
  domain: "staffing" | "ticketing"
  action: "created" | "skipped"
  target: string
  detail: string
  id?: string
}

export interface ProvisionFailure {
  domain: "staffing" | "ticketing"
  target: string
  error: string
}

export interface ProvisionEventOperationsResult {
  eventId: string
  staffShiftsCreated: string[]
  ticketTypesCreated: string[]
  skipped: string[]
  changes: ProvisionChange[]
  failures: ProvisionFailure[]
  setupChecklist: ReturnType<typeof buildEventSetupChecklist>
}

export async function provisionEventOperations(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  eventId: string
  input: unknown
}): Promise<ProvisionEventOperationsResult> {
  const parsed = provisionEventOperationsSchema.safeParse(args.input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid provision payload.")
  }
  if (!parsed.data.reviewed) {
    throw new Error("Provisioning requires reviewed: true.")
  }

  // Authorize via event access (org-scoped).
  const event = await AdminTourEventOperationsService.getEvent({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    orgId: args.orgId,
  })

  const staffShiftsCreated: string[] = []
  const ticketTypesCreated: string[] = []
  const skipped: string[] = []
  const changes: ProvisionChange[] = []
  const failures: ProvisionFailure[] = []

  for (const shift of parsed.data.staff_shifts) {
    const target = `shift:${shift.staff_member_id}:${shift.shift_date}`
    try {
      const { data: existing } = await args.supabase
        .from("staff_shifts")
        .select("id")
        .eq("event_id", args.eventId)
        .eq("staff_member_id", shift.staff_member_id)
        .eq("shift_date", shift.shift_date)
        .maybeSingle()
      if (existing?.id) {
        skipped.push(target)
        changes.push({
          domain: "staffing",
          action: "skipped",
          target,
          detail: "Shift already exists for staff/date",
          id: String(existing.id),
        })
        continue
      }

      const insertPayload: Record<string, unknown> = {
        event_id: args.eventId,
        staff_member_id: shift.staff_member_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        role_assignment: shift.role_assignment || "crew",
        status: "scheduled",
        created_by: args.userId,
        notes: shift.notes || "Provisioned via reviewed command",
        org_id: args.orgId,
      }
      const { data, error } = await args.supabase
        .from("staff_shifts")
        .insert(insertPayload)
        .select("id")
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (data?.id) {
        staffShiftsCreated.push(String(data.id))
        changes.push({
          domain: "staffing",
          action: "created",
          target,
          detail: `Created shift ${shift.start_time}-${shift.end_time}`,
          id: String(data.id),
        })
      }
    } catch (error) {
      failures.push({
        domain: "staffing",
        target,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  for (const ticket of parsed.data.ticket_types) {
    const target = `ticket:${ticket.name}`
    try {
      const { data: existing } = await args.supabase
        .from("ticket_types")
        .select("id")
        .eq("event_id", args.eventId)
        .ilike("name", ticket.name)
        .maybeSingle()
      if (existing?.id) {
        skipped.push(target)
        changes.push({
          domain: "ticketing",
          action: "skipped",
          target,
          detail: "Ticket type already exists",
          id: String(existing.id),
        })
        continue
      }

      const { data, error } = await args.supabase
        .from("ticket_types")
        .insert({
          event_id: args.eventId,
          name: ticket.name,
          price: ticket.price,
          quantity_available: ticket.quantity_available,
          quantity_sold: 0,
          category: ticket.category || "general",
          is_active: true,
        })
        .select("id")
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (data?.id) {
        ticketTypesCreated.push(String(data.id))
        changes.push({
          domain: "ticketing",
          action: "created",
          target,
          detail: `Created inventory qty=${ticket.quantity_available} @ ${ticket.price}`,
          id: String(data.id),
        })
      }
    } catch (error) {
      failures.push({
        domain: "ticketing",
        target,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const setupChecklist = buildEventSetupChecklist({
    eventId: args.eventId,
    event: event as Record<string, unknown>,
    counts: {
      staffShifts: staffShiftsCreated.length,
      ticketTypes: ticketTypesCreated.length,
    },
  })

  return {
    eventId: args.eventId,
    staffShiftsCreated,
    ticketTypesCreated,
    skipped,
    changes,
    failures,
    setupChecklist,
  }
}
