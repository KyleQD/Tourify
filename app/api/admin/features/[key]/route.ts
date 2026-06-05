import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/audit'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function resolveOrgId(userId: string): Promise<string | null> {
  const { data } = await serviceClient().from('profiles').select('org_id').eq('id', userId).maybeSingle()
  return data?.org_id ?? null
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  rollout_percentage: z.number().min(0).max(100).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  target_org_ids: z.array(z.string().uuid()).nullable().optional(),
})

function extractKey(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('features')
  return idx >= 0 ? decodeURIComponent(segments[idx + 1] || '') || null : null
}

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const key = extractKey(request.url)
  if (!key) return NextResponse.json({ error: 'Missing flag key' }, { status: 400 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('feature_flags')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orgId = await resolveOrgId(user.id)
  if (orgId) await logAuditEvent({ actorId: user.id, orgId, action: 'toggle', entityType: 'feature_flag', entityId: data.id, newValues: parsed.data })

  return NextResponse.json({ flag: data })
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const key = extractKey(request.url)
  if (!key) return NextResponse.json({ error: 'Missing flag key' }, { status: 400 })

  const { data: existing } = await supabase.from('feature_flags').select('id').eq('key', key).maybeSingle()
  const { error } = await supabase.from('feature_flags').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orgId = await resolveOrgId(user.id)
  if (orgId && existing?.id) await logAuditEvent({ actorId: user.id, orgId, action: 'delete', entityType: 'feature_flag', entityId: existing.id, oldValues: { key } })

  return NextResponse.json({ success: true })
})
