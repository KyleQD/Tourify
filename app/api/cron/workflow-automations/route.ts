import { NextRequest, NextResponse } from 'next/server'
import { runWorkflowAutomations } from '@/lib/workflows/automation'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()

  if (process.env.FEATURE_UNIFIED_WORKFLOW_THREADS !== '1')
    return NextResponse.json({ success: true, skipped: true, reason: 'workflow_disabled' })

  try {
    const result = await runWorkflowAutomations()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[cron/workflow-automations]', error)
    return NextResponse.json({ success: false, error: 'Failed to run workflow automations' }, { status: 500 })
  }
}
