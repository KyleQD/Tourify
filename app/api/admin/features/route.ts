import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/audit'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

const createFlagSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_-]+$/, 'Key must be lowercase alphanumeric with underscores/dashes'),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional().default(false),
  rollout_percentage: z.number().min(0).max(100).optional().default(0),
  target_org_ids: z.array(z.string().uuid()).optional(),
})

export const GET = withAdminAuth(async (_request: NextRequest, { supabase }) => {
  const { data: flags, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flags: flags || [] })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const body = await request.json()
  const parsed = createFlagSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('feature_flags')
    .insert(parsed.data)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await serviceClient().from('profiles').select('org_id').eq('id', user.id).maybeSingle()
  if (profile?.org_id) {
    await logAuditEvent({ actorId: user.id, orgId: profile.org_id, action: 'create', entityType: 'feature_flag', entityId: data.id, newValues: { key: data.key, enabled: data.enabled } })
  }

  return NextResponse.json({ flag: data }, { status: 201 })
})
