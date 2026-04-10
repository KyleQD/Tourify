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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async () => {
    const { id } = await context.params
    const template = await EnhancedOnboardingTemplatesService.getTemplateById(id)
    return NextResponse.json({ success: true, data: template })
  })(request)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const body = await req.json()

    const updated = await EnhancedOnboardingTemplatesService.updateTemplate({
      id,
      venueId: body.venue_id,
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

    return NextResponse.json({ success: true, data: updated })
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async () => {
    const { id } = await context.params
    await EnhancedOnboardingTemplatesService.deleteTemplate(id)
    return NextResponse.json({ success: true })
  })(request)
}
