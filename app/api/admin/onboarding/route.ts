import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { EnhancedOnboardingTemplatesService } from '@/lib/services/enhanced-onboarding-templates.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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

    return NextResponse.json({
      success: true,
      data,
      type: type || 'candidates'
    })
  } catch (error) {
    console.error('❌ [Onboarding API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch onboarding data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
  } catch (error) {
    console.error('❌ [Onboarding API] Error creating workflow:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create onboarding workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 