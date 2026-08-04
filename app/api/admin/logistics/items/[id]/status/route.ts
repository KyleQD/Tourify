import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import {
  executeLogisticsCommand,
  getLogisticsCommandErrorStatus,
  LogisticsCommandError,
} from '@/lib/admin/logistics-command.service'
import {
  LogisticsStatusTransitionError,
  parseLogisticsCommand,
} from '@/lib/admin/logistics-command-schemas'

export async function POST(
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
    const parsed = parseLogisticsCommand({
      action: 'transition_task_status',
      id,
      status: body.status,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error, details: parsed.details, code: 'validation_failed' },
        { status: 400 },
      )
    }
    const result = await executeLogisticsCommand({
      supabase: auth.supabase,
      userId: auth.user.id,
      orgId: admin.orgId,
      command: parsed.data,
    })
    return NextResponse.json({ item: result.data, message: result.message })
  } catch (error) {
    const status = getLogisticsCommandErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : 'Failed to update status'
    const code =
      error instanceof LogisticsCommandError || error instanceof LogisticsStatusTransitionError
        ? error.code
        : 'status_failed'
    return NextResponse.json({ success: false, error: message, code }, { status })
  }
}
