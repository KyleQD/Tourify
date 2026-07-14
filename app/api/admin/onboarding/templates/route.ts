import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { resolveHiringActorFromRequest } from '@/lib/api/hiring-route-helpers'
import { presentTemplateListItem } from '@/lib/hiring/api-presenters'
import {
  createTemplateForEmployer,
  listTemplatesForEmployer,
} from '@/lib/services/hiring-onboarding-templates.service'
import { EnhancedOnboardingTemplatesService } from '@/lib/services/enhanced-onboarding-templates.service'
import { createHiringServiceClient } from '@/lib/supabase/hiring-service-client'

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const { searchParams } = new URL(req.url)
    const venueId = searchParams.get('venue_id')
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    if (entityType && entityId) {
      const supabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({ request: req, supabase })
      if (!actorResult.ok) {
        return NextResponse.json(
          { ok: false, error: { message: actorResult.error.message, details: actorResult.error.details } },
          { status: 403 }
        )
      }

      const { data, error } = await listTemplatesForEmployer({ supabase, employer: actorResult.data.employer })
      if (error) {
        return NextResponse.json(
          { ok: false, error: { message: 'Unable to load onboarding templates.', details: error } },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, data: (data ?? []).map((template) => presentTemplateListItem(template)) })
    }

    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID is required' }, { status: 400 })

    const templates = await EnhancedOnboardingTemplatesService.getTemplates(venueId)
    return NextResponse.json({ success: true, data: templates })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const entityType = body.entity_type ?? body.employer_entity_type
    const entityId = body.entity_id ?? body.employer_entity_id

    // Entity-scoped create (polymorphic hiring). Falls back to the legacy venue path below.
    if (entityType && entityId) {
      const supabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({ request: req, supabase, body })
      if (!actorResult.ok) {
        return NextResponse.json(
          { ok: false, error: { message: actorResult.error.message, details: actorResult.error.details } },
          { status: 403 }
        )
      }

      const { data, error } = await createTemplateForEmployer({
        supabase,
        employer: actorResult.data.employer,
        actorUserId: actorResult.data.userId,
        input: {
          name: body.name,
          description: body.description,
          department: body.department,
          position: body.position,
          employmentType: body.employment_type,
          fields: Array.isArray(body.fields) ? body.fields : [],
          estimatedDays: body.estimated_days,
          requiredDocuments: Array.isArray(body.required_documents) ? body.required_documents : [],
          tags: Array.isArray(body.tags) ? body.tags : [],
          isDefault: Boolean(body.is_default),
        },
      })

      if (error) {
        return NextResponse.json({ ok: false, error: { message: error } }, { status: 500 })
      }

      return NextResponse.json({ ok: true, data: presentTemplateListItem({ ...data, scope: 'employer' }) })
    }

    const venueId = body.venue_id
    if (!venueId) return NextResponse.json({ success: false, error: 'Venue ID or entity scope is required' }, { status: 400 })

    const template = await EnhancedOnboardingTemplatesService.createTemplate({
      venueId,
      name: body.name || 'Untitled Template',
      description: body.description || 'Custom onboarding template',
      department: body.department || 'General',
      position: body.position || 'Staff',
      employmentType: body.employment_type || 'full_time',
      fields: Array.isArray(body.fields) && body.fields.length > 0 ? body.fields : [],
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
