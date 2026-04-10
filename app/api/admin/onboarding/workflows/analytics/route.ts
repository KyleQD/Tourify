import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import type { OnboardingWorkflow } from '@/types/admin-onboarding'

function hasSyntheticRecords(records: Array<{ id?: string }>) {
  return records.some((record) => {
    const id = typeof record?.id === 'string' ? record.id : ''
    return id.startsWith('mock-') || id.startsWith('fallback-')
  })
}

function getWorkflowStatus(workflow: OnboardingWorkflow): string | null {
  const withStatus = workflow as OnboardingWorkflow & { status?: unknown }
  if (typeof withStatus.status !== 'string') return null
  return withStatus.status
}

function getAverageDurationDays(workflows: OnboardingWorkflow[]) {
  const completed = workflows.filter((workflow) => getWorkflowStatus(workflow) === 'completed')
  if (!completed.length) return 0

  const totalDays = completed.reduce((sum, workflow) => {
    if (!workflow.created_at || !workflow.updated_at) return sum
    const startedAt = new Date(workflow.created_at).getTime()
    const endedAt = new Date(workflow.updated_at).getTime()
    if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt < startedAt) return sum
    const days = Math.max(1, Math.round((endedAt - startedAt) / (1000 * 60 * 60 * 24)))
    return sum + days
  }, 0)

  return Math.round(totalDays / completed.length)
}

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const workflows = await AdminOnboardingStaffService.getOnboardingWorkflows(venueId)
    if (hasSyntheticRecords(workflows as Array<{ id?: string }>)) {
      return NextResponse.json(
        { success: false, error: 'Live onboarding workflow analytics unavailable' },
        { status: 503 }
      )
    }
    const completedWorkflows = workflows.filter((workflow) => getWorkflowStatus(workflow) === 'completed').length
    const activeWorkflows = workflows.filter((workflow) => {
      const status = getWorkflowStatus(workflow)
      if (!status) return true
      return status === 'active' || status === 'in_progress'
    }).length

    const analytics = {
      total_workflows: workflows.length,
      active_workflows: activeWorkflows,
      completed_workflows: completedWorkflows,
      average_duration_days: getAverageDurationDays(workflows),
    }

    return NextResponse.json({ success: true, data: analytics })
  })(request)
}
