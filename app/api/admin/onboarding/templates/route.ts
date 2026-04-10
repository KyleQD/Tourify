import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { EnhancedOnboardingTemplatesService } from '@/lib/services/enhanced-onboarding-templates.service'

function getDefaultFields() {
  return [
    {
      id: 'full_name',
      type: 'text',
      label: 'Full Name',
      required: true,
      order: 1,
      section: 'Personal Information',
    },
  ]
}

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const templates = await EnhancedOnboardingTemplatesService.getTemplates(venueId)
    return NextResponse.json({ success: true, data: templates })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const venueId = body.venue_id
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const template = await EnhancedOnboardingTemplatesService.createTemplate({
      venueId,
      name: body.name || 'Untitled Template',
      description: body.description || 'Custom onboarding template',
      department: body.department || 'General',
      position: body.position || 'Staff',
      employmentType: body.employment_type || 'full_time',
      fields: Array.isArray(body.fields) && body.fields.length > 0 ? body.fields : getDefaultFields(),
      estimatedDays: Number(body.estimated_days || 3),
      requiredDocuments: Array.isArray(body.required_documents) ? body.required_documents : [],
      assignees: Array.isArray(body.assignees) ? body.assignees : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      isDefault: Boolean(body.is_default),
    })

    return NextResponse.json({ success: true, data: template })
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('id')
    if (!templateId) return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 })

    await EnhancedOnboardingTemplatesService.deleteTemplate(templateId)
    return NextResponse.json({ success: true })
  })(request)
}
