import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { EnhancedOnboardingTemplatesService } from '@/lib/services/enhanced-onboarding-templates.service'
import { withAdminAuth } from '@/lib/auth/api-auth'

function hasSyntheticRecords(records: Array<{ id?: string }>) {
  return records.some((record) => {
    const id = typeof record?.id === 'string' ? record.id : ''
    return id.startsWith('mock-') || id.startsWith('fallback-')
  })
}

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    const type = searchParams.get('type') // 'workflows' or 'candidates'

    if (!venueId) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    let data
    if (type === 'workflows') {
      data = await AdminOnboardingStaffService.getOnboardingWorkflows(venueId)
    } else if (type === 'template_catalog') {
      data = EnhancedOnboardingTemplatesService.getPositionTemplateCatalog()
    } else {
      data = await AdminOnboardingStaffService.getOnboardingCandidates(venueId)
    }
    if (Array.isArray(data) && hasSyntheticRecords(data as Array<{ id?: string }>)) {
      return NextResponse.json(
        { success: false, error: 'Live onboarding data unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      type: type || 'candidates'
    })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const { venue_id, action, ...workflowData } = body

    if (!venue_id) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    if (action === 'initialize_templates') {
      const templates = await EnhancedOnboardingTemplatesService.initializeDefaultTemplates(venue_id)
      return NextResponse.json({
        success: true,
        data: templates,
        message: 'Position-based onboarding templates initialized',
      })
    }

    const workflow = await AdminOnboardingStaffService.createOnboardingWorkflow(venue_id, workflowData)

    return NextResponse.json({
      success: true,
      data: workflow
    })
  })(request)
} 