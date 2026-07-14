import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { isOrganizationType } from '@/lib/accounts/account-types'
import { escapeHtml, emailLayout, emailButton, emailFallbackUrl } from '@/lib/email/email-layout'

const inviteSchema = z.object({
  organizerAccountId: z.string().uuid(),
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  role: z.enum(['admin', 'tour_manager', 'production']).default('tour_manager'),
})

async function resolveOrganizer(supabase: any, organizerAccountId: string, actorUserId: string) {
  const { data: organizer } = await supabase
    .from('organizer_accounts')
    .select('id, user_id, ops_org_id, organization_name, url_slug')
    .eq('id', organizerAccountId)
    .maybeSingle()

  if (!organizer) return { error: 'Organization not found' as const }

  const isOwner = organizer.user_id === actorUserId
  let canInvite = isOwner

  if (!canInvite && organizer.ops_org_id) {
    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', organizer.ops_org_id)
      .eq('user_id', actorUserId)
      .maybeSingle()
    canInvite = Boolean(member && ['owner', 'admin'].includes(String(member.role)))
  }

  if (!canInvite) return { error: 'Forbidden' as const }
  return { organizer }
}

async function sendInviteEmail(params: {
  email: string
  role: string
  organizationName: string
  token: string
}) {
  const from = process.env.EMAIL_FROM
  const sendgridKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_PROVIDER_API_KEY
  if (!from || !sendgridKey) return { sent: false }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourify.live'
  const acceptUrl = `${site}/orgs/invite/accept?token=${params.token}`
  const role = escapeHtml(params.role)
  const orgName = escapeHtml(params.organizationName)
  const html = emailLayout({
    title: 'Organization Invitation',
    preheader: `You have been invited to join ${params.organizationName} on Tourify as ${params.role}.`,
    subtitle: 'Organizations',
    bodyHtml: `
      <p style="margin:0 0 16px 0;color:#f8fafc;font-size:20px;font-weight:600;">You are invited</p>
      <p style="margin:0 0 16px 0;color:#cbd5e1;">Join <strong style="color:#f8fafc;">${orgName}</strong> as <strong style="color:#f8fafc;">${role}</strong>.</p>
      <p style="margin:0 0 24px 0;color:#cbd5e1;">Accept to unlock Admin / Work Mode for this organization. Tour managers remain General users.</p>
      ${emailButton({ href: acceptUrl, label: 'Accept invitation' })}
      ${emailFallbackUrl(acceptUrl)}
    `,
  })

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendgridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.email }] }],
      from: { email: from },
      subject: `Join ${params.organizationName} on Tourify`,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  return { sent: true }
}

export async function POST(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  if (!isOrganizationType(ctx.accountType) && ctx.accountType !== 'general')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid invite payload' }, { status: 400 })

  const { organizerAccountId, email, userId, role } = parsed.data
  if (!email && !userId)
    return NextResponse.json({ error: 'email or userId required' }, { status: 400 })

  const resolved = await resolveOrganizer(ctx.supabase, organizerAccountId, ctx.userId)
  if ('error' in resolved) {
    const status = resolved.error === 'Forbidden' ? 403 : 404
    return NextResponse.json({ error: resolved.error }, { status })
  }

  const { organizer } = resolved
  let targetUserId = userId || null

  if (!targetUserId && email) {
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()
    targetUserId = profile?.id || null
  }

  let inviteToken: string | null = null

  if (organizer.ops_org_id && targetUserId) {
    const { error: memberError } = await ctx.supabase.from('org_members').upsert(
      {
        org_id: organizer.ops_org_id,
        user_id: targetUserId,
        role,
        invited_by: ctx.userId,
      },
      { onConflict: 'org_id,user_id' }
    )
    if (memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })

    try {
      await ctx.supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'org_invite',
        title: 'Organization access granted',
        message: `You were granted ${role} access to ${organizer.organization_name}.`,
        data: {
          organizer_account_id: organizer.id,
          ops_org_id: organizer.ops_org_id,
          role,
        },
      })
    } catch {
      // notifications table shape may vary
    }
  } else if (organizer.ops_org_id && email) {
    inviteToken = crypto.randomUUID().replace(/-/g, '')
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    const { error: inviteError } = await ctx.supabase.from('org_invites').insert({
      org_id: organizer.ops_org_id,
      email,
      role,
      token: inviteToken,
      expires_at: expires.toISOString(),
      created_by: ctx.userId,
    })
    if (inviteError)
      return NextResponse.json({ error: inviteError.message }, { status: 500 })

    await sendInviteEmail({
      email,
      role,
      organizationName: organizer.organization_name || 'Organization',
      token: inviteToken,
    })
  }

  if (targetUserId) {
    await ctx.supabase.from('account_relationships').upsert(
      {
        owner_user_id: targetUserId,
        owned_profile_id: organizer.id,
        account_type: 'organization',
        permissions: {
          can_post: true,
          can_manage_settings: role === 'admin',
          can_view_analytics: true,
          can_manage_content: true,
          role,
        },
      },
      { onConflict: 'owner_user_id,owned_profile_id' }
    )
  }

  return NextResponse.json({
    ok: true,
    organizerAccountId: organizer.id,
    opsOrgId: organizer.ops_org_id,
    role,
    targetUserId,
    inviteToken: inviteToken ? true : false,
    note:
      'Tour managers remain General users. This grant unlocks Admin / Work Mode for the organization.',
  })
}

export async function GET(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const organizerAccountId = request.nextUrl.searchParams.get('organizerAccountId')
  if (!organizerAccountId)
    return NextResponse.json({ error: 'organizerAccountId required' }, { status: 400 })

  const resolved = await resolveOrganizer(ctx.supabase, organizerAccountId, ctx.userId)
  if ('error' in resolved) {
    const status = resolved.error === 'Forbidden' ? 403 : 404
    return NextResponse.json({ error: resolved.error }, { status })
  }

  const { organizer } = resolved
  if (!organizer.ops_org_id)
    return NextResponse.json({ members: [], relationships: [] })

  const [{ data: members }, { data: relationships }] = await Promise.all([
    ctx.supabase
      .from('org_members')
      .select('user_id, role, created_at')
      .eq('org_id', organizer.ops_org_id)
      .in('role', ['admin', 'tour_manager', 'owner', 'production']),
    ctx.supabase
      .from('account_relationships')
      .select('owner_user_id, account_type, permissions')
      .eq('owned_profile_id', organizer.id),
  ])

  return NextResponse.json({
    members: members || [],
    relationships: relationships || [],
  })
}
