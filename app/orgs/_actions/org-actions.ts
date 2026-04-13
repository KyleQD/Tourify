'use server'

import { z } from 'zod'
import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createRateLimiter } from '@/lib/utils/rate-limit'
import { escapeHtml, emailLayout, emailButton, emailFallbackUrl } from '@/lib/email/email-layout'

const action = createSafeActionClient()

const createOrgSchema = z.object({
  name: z.string().min(2).max(80)
})

export const createOrganizationAction = action.schema(createOrgSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { ok: false, error: 'not_authenticated' }

  const slug = parsedInput.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)

  const { data, error } = await supabase
    .from('organizations')
    .insert({ name: parsedInput.name, slug, created_by: user.user.id })
    .select('id, slug')
    .single()

  if (error) return { ok: false, error: 'create_failed' }

  // Add creator as owner
  await supabase
    .from('org_members')
    .insert({ org_id: data.id, user_id: user.user.id, role: 'owner', invited_by: user.user.id })

  revalidatePath('/dashboard')
  return { ok: true, orgId: data.id, slug: data.slug }
})

const inviteSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['owner','admin','production','finance'])
})

export const createInviteAction = action.schema(inviteSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { ok: false, error: 'not_authenticated' }

  // Rate limit invites per user
  const rl = createRateLimiter({ namespace: 'invite', limit: 10, windowSec: 60 })
  const { success } = await rl.check(`invite_${user.user.id}`)
  if (!success) return { ok: false, error: 'rate_limited' }

  const token = crypto.randomUUID().replace(/-/g, '')
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7d

  const { error } = await supabase
    .from('org_invites')
    .insert({ org_id: parsedInput.orgId, email: parsedInput.email, role: parsedInput.role, token, expires_at: expires.toISOString(), created_by: user.user.id })

  if (error) return { ok: false, error: 'invite_failed' }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourify.live'
  const acceptUrl = `${site}/orgs/invite/accept?token=${token}`

  const from = process.env.EMAIL_FROM
  const sendgridKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_PROVIDER_API_KEY
  if (!from || !sendgridKey) return { ok: true } // silently succeed without email in dev

  const role = escapeHtml(parsedInput.role)
  const inviteHtml = emailLayout({
    title: 'Organization Invitation',
    preheader: `You have been invited to join an organization on Tourify as ${parsedInput.role}.`,
    subtitle: 'Organizations',
    bodyHtml: `
      <p style="margin:0 0 16px 0;color:#f8fafc;font-size:20px;font-weight:600;">You are invited</p>
      <p style="margin:0 0 16px 0;color:#cbd5e1;">You have been invited to join an organization on Tourify as <strong style="color:#f8fafc;">${role}</strong>.</p>
      <p style="margin:0 0 24px 0;color:#cbd5e1;">Accept the invitation below to get started.</p>
      ${emailButton({ href: acceptUrl, label: 'Accept invitation' })}
      ${emailFallbackUrl(acceptUrl)}
    `,
  })

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: parsedInput.email }], subject: 'You have been invited to an organization on Tourify' }],
      from: { email: from, name: 'Tourify' },
      content: [{ type: 'text/html', value: inviteHtml }]
    })
  })
  if (!res.ok) return { ok: false, error: 'email_failed' }

  return { ok: true }
})


