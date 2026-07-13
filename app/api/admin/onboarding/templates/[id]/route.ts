import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { resolveHiringActorFromRequest } from '@/lib/api/hiring-route-helpers'
import {
  deleteTemplateForEmployer,
  getTemplateById,
  updateTemplateForEmployer,
} from '@/lib/services/hiring-onboarding-templates.service'
import { EnhancedOnboardingTemplatesService } from '@/lib/services/enhanced-onboarding-templates.service'
import { createHiringServiceClient } from '@/lib/supabase/hiring-service-client'

function hasEntityScope(searchParams: URLSearchParams, body?: Record<string, unknown>) {
  const entityType = searchParams.get('entity_type') ?? (body?.entity_type as string | undefined)
  const entityId = searchParams.get('entity_id') ?? (body?.entity_id as string | undefined)
  return Boolean(entityType && entityId)
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const { searchParams } = new URL(req.url)

    if (hasEntityScope(searchParams)) {
      const supabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({ request: req, supabase })
      if (!actorResult.ok) {
        return NextResponse.json({ ok: false, error: { message: actorResult.error.message } }, { status: 403 })
      }

      const { data, error } = await getTemplateById({ supabase, id })
      if (error || !data) {
        return NextResponse.json({ ok: false, error: { message: error ?? 'Template not found.' } }, { status: 404 })
      }

      return NextResponse.json({ ok: true, data })
    }

    const template = await EnhancedOnboardingTemplatesService.getTemplateById(id)
    return NextResponse.json({ success: true, data: template })
  })(request)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const body = await req.json()
    const { searchParams } = new URL(req.url)

    if (hasEntityScope(searchParams, body)) {
      const supabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({ request: req, supabase, body })
      if (!actorResult.ok) {
        return NextResponse.json({ ok: false, error: { message: actorResult.error.message } }, { status: 403 })
      }

      const result = await updateTemplateForEmployer({
        supabase,
        employer: actorResult.data.employer,
        id,
        input: {
          name: body.name,
          description: body.description,
          department: body.department,
          position: body.position,
          employmentType: body.employment_type,
          fields: Array.isArray(body.fields) ? body.fields : undefined,
          estimatedDays: body.estimated_days,
          requiredDocuments: Array.isArray(body.required_documents) ? body.required_documents : undefined,
          tags: Array.isArray(body.tags) ? body.tags : undefined,
          isDefault: typeof body.is_default === 'boolean' ? body.is_default : undefined,
        },
      })

      if (result.forbidden) {
        return NextResponse.json({ ok: false, error: { message: result.error } }, { status: 403 })
      }
      if (result.error) {
        return NextResponse.json({ ok: false, error: { message: result.error } }, { status: 500 })
      }

      return NextResponse.json({ ok: true, data: result.data })
    }

    const updated = await EnhancedOnboardingTemplatesService.updateTemplate({
      id,
      venueId: body.venue_id,
      name: body.name || 'Untitled Template',
      description: body.description || 'Custom onboarding template',
      department: body.department || 'General',
      position: body.position || 'Staff',
      employmentType: body.employment_type || 'full_time',
      fields: Array.isArray(body.fields) ? body.fields : [],
      estimatedDays: Number(body.estimated_days || 3),
      requiredDocuments: Array.isArray(body.required_documents) ? body.required_documents : [],
      assignees: Array.isArray(body.assignees) ? body.assignees : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      isDefault: Boolean(body.is_default),
    })

    return NextResponse.json({ success: true, data: updated })
  })(request)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (req) => {
    const { id } = await context.params
    const { searchParams } = new URL(req.url)

    if (hasEntityScope(searchParams)) {
      const supabase = createHiringServiceClient()
      const actorResult = await resolveHiringActorFromRequest({ request: req, supabase })
      if (!actorResult.ok) {
        return NextResponse.json({ ok: false, error: { message: actorResult.error.message } }, { status: 403 })
      }

      const result = await deleteTemplateForEmployer({ supabase, employer: actorResult.data.employer, id })
      if (result.forbidden) {
        return NextResponse.json({ ok: false, error: { message: result.error } }, { status: 403 })
      }
      if (result.error) {
        return NextResponse.json({ ok: false, error: { message: result.error } }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    await EnhancedOnboardingTemplatesService.deleteTemplate(id)
    return NextResponse.json({ success: true })
  })(request)
}
