/**
 * CAL-103 — Calendar create/edit routes delegate to domain commands.
 * No direct heterogeneous inserts; incomplete placeholders are rejected.
 */

import { z } from 'zod'
import {
  executeLogisticsCommand,
  LogisticsCommandError,
} from '@/lib/admin/logistics-command.service'
import { LogisticsStatusTransitionError } from '@/lib/admin/logistics-command-schemas'
import {
  validateWorkforceAssignmentParents,
  WorkforceParentValidationError,
  workforceAuthorityErrorResponse,
} from '@/lib/admin/workforce-authority.service'
import { upsertShiftLinkedAssignment } from '@/lib/admin/workforce-assignment.service'
import { AdminTourEventOperationsService } from '@/lib/admin/tour-event-operations.service'

type SupabaseLike = any

const uuid = z.string().uuid()
const optionalUuid = uuid.optional().nullable()

export class CalendarCommandError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'CalendarCommandError'
    this.code = code
    this.status = status
    this.details = details
  }
}

const calendarCreateBodySchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    type: z.enum([
      'event',
      'tour',
      'task',
      'shift',
      'logistics',
      'production',
      'hiring',
      'travel',
      'hold',
      'obligation',
    ]),
    start: z.string().min(1),
    end: z.string().optional().nullable(),
    description: z.string().max(8000).optional().nullable(),
    location: z.string().max(500).optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().nullable(),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    assignee_id: optionalUuid,
    staff_member_id: optionalUuid,
  })

export type CalendarCreateBody = z.infer<typeof calendarCreateBodySchema>

export function getCalendarCommandErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof CalendarCommandError) return error.status
  if (error instanceof LogisticsCommandError) return error.status
  if (error instanceof LogisticsStatusTransitionError) return error.status
  if (error instanceof WorkforceParentValidationError) return error.status
  if (error instanceof z.ZodError) return 400
  return fallback
}

async function resolveStaffMemberId(args: {
  supabase: SupabaseLike
  orgId: string
  staffMemberId?: string | null
  assigneeId?: string | null
}): Promise<string> {
  if (args.staffMemberId) return args.staffMemberId

  if (args.assigneeId) {
    const { data: byUser } = await args.supabase
      .from('staff_members')
      .select('id')
      .eq('user_id', args.assigneeId)
      .eq('org_id', args.orgId)
      .limit(1)
      .maybeSingle()

    if (byUser?.id) return String(byUser.id)

    const { data: byId } = await args.supabase
      .from('staff_members')
      .select('id')
      .eq('id', args.assigneeId)
      .eq('org_id', args.orgId)
      .limit(1)
      .maybeSingle()

    if (byId?.id) return String(byId.id)
  }

  throw new CalendarCommandError(
    'incomplete_context',
    'staff_member_id or assignee_id (resolvable staff member) is required to create a shift.',
    422,
  )
}

async function createShiftViaStaffingCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  body: CalendarCreateBody
}) {
  const eventId = args.body.event_id
  if (!eventId) {
    throw new CalendarCommandError(
      'incomplete_context',
      'event_id is required to create a staff shift.',
      422,
      { href: '/admin/dashboard/staff' },
    )
  }

  const staffMemberId = await resolveStaffMemberId({
    supabase: args.supabase,
    orgId: args.orgId,
    staffMemberId: args.body.staff_member_id,
    assigneeId: args.body.assignee_id,
  })

  const role = args.body.title.trim()
  if (!role) {
    throw new CalendarCommandError('incomplete_context', 'Shift role/title is required.', 422)
  }

  try {
    await validateWorkforceAssignmentParents({
      supabase: args.supabase,
      userId: args.userId,
      orgId: args.orgId,
      eventId,
      staffMemberId,
      role,
      requireRole: true,
    })
  } catch (error) {
    const resolved = workforceAuthorityErrorResponse(error, 'Parent validation failed')
    throw new CalendarCommandError(
      resolved.code || 'parent_validation_failed',
      resolved.message,
      resolved.status,
    )
  }

  const start = new Date(args.body.start)
  if (Number.isNaN(start.getTime())) {
    throw new CalendarCommandError('validation_failed', 'Invalid start datetime.', 400)
  }
  const end = args.body.end ? new Date(args.body.end) : start
  if (Number.isNaN(end.getTime())) {
    throw new CalendarCommandError('validation_failed', 'Invalid end datetime.', 400)
  }

  const shift_date = start.toISOString().slice(0, 10)
  const start_time = start.toISOString().slice(11, 19)
  const end_time = end.toISOString().slice(11, 19)

  const { data, error } = await args.supabase
    .from('staff_shifts')
    .insert({
      org_id: args.orgId,
      event_id: eventId,
      staff_member_id: staffMemberId,
      shift_date,
      start_time,
      end_time,
      role_assignment: role,
      notes: args.body.description ?? null,
      status: 'scheduled',
      created_by: args.userId,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new CalendarCommandError(
      'db_error',
      error?.message || 'Failed to create staff shift',
      500,
    )
  }

  try {
    await upsertShiftLinkedAssignment({
      supabase: args.supabase,
      shift: data,
      actorUserId: args.userId,
      notify: false,
    })
  } catch {
    // Assignment sync is best-effort; shift row is the domain create success.
  }

  return { data, table: 'staff_shifts', message: 'Staff shift created via staffing command' }
}

async function createTaskViaLogisticsCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  body: CalendarCreateBody
}) {
  if (!args.body.event_id && !args.body.tour_id) {
    throw new CalendarCommandError(
      'incomplete_context',
      'event_id or tour_id is required to create a calendar task.',
      422,
    )
  }

  if (args.body.tour_id) {
    await AdminTourEventOperationsService.getTour({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.body.tour_id,
      orgId: args.orgId,
    })
  }

  if (args.body.event_id) {
    await AdminTourEventOperationsService.getEvent({
      supabase: args.supabase,
      userId: args.userId,
      eventId: args.body.event_id,
      orgId: args.orgId,
    })
  }

  let assignedTo: string | null = args.body.assignee_id ?? null
  if (assignedTo) {
    const { data: profile } = await args.supabase
      .from('profiles')
      .select('id')
      .eq('id', assignedTo)
      .maybeSingle()
    if (!profile?.id) {
      throw new CalendarCommandError(
        'incomplete_context',
        'assignee_id must reference an authenticated user profile.',
        422,
      )
    }
  }

  const dueDate = new Date(args.body.start)
  if (Number.isNaN(dueDate.getTime())) {
    throw new CalendarCommandError('validation_failed', 'Invalid start datetime.', 400)
  }

  const result = await executeLogisticsCommand({
    supabase: args.supabase,
    userId: args.userId,
    orgId: args.orgId,
    command: {
      action: 'create_task',
      status: 'pending' as const,
      type: 'communication',
      title: args.body.title,
      description: args.body.description ?? null,
      priority: args.body.priority || 'medium',
      event_id: args.body.event_id ?? null,
      tour_id: args.body.tour_id ?? null,
      assigned_to_user_id: assignedTo,
      due_date: dueDate.toISOString().slice(0, 10),
    },
  })

  return {
    data: result.data,
    table: 'logistics_tasks',
    message: result.message || 'Logistics task created via logistics command',
  }
}

/**
 * Map calendar POST body to a domain create command. Rejects types that must
 * use dedicated builders (event/tour/production/hold/obligation).
 */
export async function executeCalendarCreateCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  body: unknown
}): Promise<{ data: unknown; table: string; message: string }> {
  const parsed = calendarCreateBodySchema.safeParse(args.body)
  if (!parsed.success) {
    throw new CalendarCommandError(
      'validation_failed',
      parsed.error.errors[0]?.message || 'Invalid calendar create payload',
      400,
      { issues: parsed.error.errors },
    )
  }

  const body = parsed.data
  const kind = body.type === 'logistics' ? 'shift' : body.type

  switch (kind) {
    case 'task':
      return createTaskViaLogisticsCommand({ ...args, body })
    case 'shift':
      return createShiftViaStaffingCommand({ ...args, body })
    case 'event':
      throw new CalendarCommandError(
        'use_domain_command',
        'Create events via the event command surface, not calendar POST.',
        422,
        { href: '/admin/dashboard/events/create' },
      )
    case 'tour':
      throw new CalendarCommandError(
        'use_domain_command',
        'Create tours via the tour builder, not calendar POST.',
        422,
        { href: '/admin/dashboard/tours/builder' },
      )
    case 'production':
      throw new CalendarCommandError(
        'use_domain_command',
        'Create production items from Event HQ, not calendar POST.',
        422,
        { href: '/admin/dashboard/events' },
      )
    case 'hold':
    case 'obligation':
      throw new CalendarCommandError(
        'use_domain_command',
        `${kind} creates are not available on calendar POST; use the owning domain command when ready.`,
        422,
      )
    default:
      throw new CalendarCommandError(
        'unsupported_type',
        `Calendar cannot create type "${body.type}" via direct insert.`,
        400,
      )
  }
}
