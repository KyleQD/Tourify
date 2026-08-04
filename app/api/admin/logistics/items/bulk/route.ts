import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import {
  executeLogisticsCommand,
  getLogisticsCommandErrorStatus,
  LogisticsCommandError,
} from '@/lib/admin/logistics-command.service'

export async function PUT(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  try {
    const body = await request.json()
    const itemIds: string[] = body.itemIds || body.ids || []
    const action: string = body.action

    if (!Array.isArray(itemIds) || itemIds.length === 0)
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })

    if (action !== 'mark_complete' && action !== 'bulk_transition_task_status')
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })

    const status = action === 'mark_complete' ? 'completed' : body.status
    if (!status)
      return NextResponse.json({ error: 'status is required' }, { status: 400 })

    const result = await executeLogisticsCommand({
      supabase: auth.supabase,
      userId: auth.user.id,
      orgId: admin.orgId,
      command: {
        action: 'bulk_transition_task_status',
        ids: itemIds,
        status,
      },
    })

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message,
    })
  } catch (error) {
    console.error('[Logistics Items Bulk] PUT error:', error)
    const status = getLogisticsCommandErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : 'Failed to perform bulk action'
    const code = error instanceof LogisticsCommandError ? error.code : 'bulk_failed'
    return NextResponse.json({ success: false, error: message, code }, { status })
  }
}
