import { NextRequest, NextResponse } from 'next/server'
import { runWorkflowAutomations } from '@/lib/workflows/automation'

function isAuthorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const header = request.headers.get('authorization')
  return header === `Bearer ${expected}`
}

export async function GET(request: NextRequest) {
  if (process.env.FEATURE_UNIFIED_WORKFLOW_THREADS !== '1')
    return NextResponse.json({ success: true, skipped: true, reason: 'workflow_disabled' })

  if (!isAuthorized(request))
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runWorkflowAutomations()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[cron/workflow-automations]', error)
    return NextResponse.json({ success: false, error: 'Failed to run workflow automations' }, { status: 500 })
  }
}
