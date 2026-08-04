import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import {
  executeLogisticsCommand,
  getLogisticsCommandErrorStatus,
  LogisticsCommandError,
} from '@/lib/admin/logistics-command.service'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  try {
    const body = await request.json()

    // Status changes must go through transition_task_status (LOG-103).
    if (body.status != null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Status updates must use POST /status or action transition_task_status',
          code: 'use_status_transition',
        },
        { status: 422 },
      )
    }

    const result = await executeLogisticsCommand({
      supabase: auth.supabase,
      userId: auth.user.id,
      orgId: admin.orgId,
      command: {
        action: 'update_task',
        id,
        title: body.title,
        description: body.description,
        type: body.type,
        category: body.category,
        priority: body.priority,
        assigned_to_user_id:
          typeof body.assignedTo !== 'undefined' ? body.assignedTo : body.assigned_to_user_id,
        due_date: typeof body.dueDate !== 'undefined' ? body.dueDate : body.due_date,
        budget: typeof body.budget !== 'undefined' ? body.budget : undefined,
        actual_cost: typeof body.actualCost !== 'undefined' ? body.actualCost : body.actual_cost,
        notes: body.notes,
        tags: body.tags,
        source_type: body.sourceType || body.source_type,
        source_id: body.sourceId || body.source_id,
      },
    })
    return NextResponse.json({ item: result.data, message: result.message })
  } catch (error) {
    const status = getLogisticsCommandErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : 'Failed to update task'
    const code = error instanceof LogisticsCommandError ? error.code : 'update_failed'
    return NextResponse.json({ success: false, error: message, code }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  try {
    const result = await executeLogisticsCommand({
      supabase: auth.supabase,
      userId: auth.user.id,
      orgId: admin.orgId,
      command: { action: 'delete_task', id },
    })
    return NextResponse.json({ success: true, data: result.data, message: result.message })
  } catch (error) {
    const status = getLogisticsCommandErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : 'Failed to delete task'
    const code = error instanceof LogisticsCommandError ? error.code : 'delete_failed'
    return NextResponse.json({ success: false, error: message, code }, { status })
  }
}
