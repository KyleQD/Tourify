import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasAdminCapability } from '@/lib/auth/admin-capabilities'
import { createClient } from '@/lib/supabase/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { sendCandidateInviteEmail } from '@/lib/services/candidate-invite-email.service'

/**
 * ADM-M-014 — invite-new-user now delivers the invitation email via Resend
 * (with delivery status persisted) instead of returning a bare token for
 * manual copy/paste. Requires a verified acting-admin context with
 * hiring.manage and scopes the candidate row to the acting org.
 */

const inviteSchema = z.object({
  venue_id: z.string().uuid().nullable().optional(),
  org_id: z.string().uuid().nullable().optional(),
  position: z.string().trim().min(1),
  department: z.string().trim().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().trim().min(3).nullable().optional(),
  employment_type: z.string().optional(),
  onboarding_template_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(),
  salary: z.union([z.string(), z.number()]).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, 'hiring.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const parsed = inviteSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'position, department, and email or phone are required' },
      { status: 400 },
    )
  }
  const body = parsed.data
  if (!body.email && !body.phone) {
    return NextResponse.json(
      { success: false, error: 'email or phone is required' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: candidate, error } = await supabase
    .from('staff_onboarding_candidates')
    .insert({
      venue_id: body.venue_id ?? null,
      org_id: body.org_id ?? admin.orgId,
      name: body.email || body.phone,
      email: body.email ?? null,
      phone: body.phone ?? null,
      position: body.position,
      department: body.department,
      status: 'pending',
      stage: 'invitation',
      application_date: new Date().toISOString(),
      employment_type: body.employment_type || 'full_time',
      onboarding_progress: 0,
      template_id: body.onboarding_template_id || null,
      start_date: body.start_date || null,
      salary: body.salary || null,
      notes: body.notes || null,
    })
    .select('*')
    .single()
  if (error) throw error

  const token = await AdminOnboardingStaffService.generateInvitationToken(candidate.id)

  // ADM-M-014: deliver the invite instead of relying on manual link sharing.
  let emailDelivery: Record<string, unknown> = {
    delivered: false,
    reason: 'no_email_address',
  }
  if (body.email) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', admin.orgId)
      .maybeSingle()
    // Generated DB types lag the organizations DDL (slug/settings); read defensively.
    const orgMeta = (orgRow ?? {}) as {
      slug?: string | null
      settings?: { organization_name?: string | null } | null
    }
    const orgName =
      orgMeta.settings?.organization_name ||
      (orgMeta.slug ? orgMeta.slug.replace(/[-_]/g, ' ') : '') ||
      'your organization'
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const result = await sendCandidateInviteEmail({
      to: body.email,
      candidateName: candidate.name ?? body.email,
      position: body.position,
      organizationName: orgName,
      inviteUrl: `${origin}/api/admin/onboarding/enhanced-invite?token=${token}`,
    })
    emailDelivery = result

    await supabase
      .from('staff_onboarding_candidates')
      .update({
        notes: `${candidate.notes ? `${candidate.notes}\n` : ''}[invite-email] ${JSON.stringify(result)}`,
      })
      .eq('id', candidate.id)
  }

  return NextResponse.json({
    success: true,
    data: {
      candidate,
      invitation_token: token,
      email_delivery: emailDelivery,
    },
  })
}
