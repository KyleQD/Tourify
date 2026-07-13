import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { data: invite } = await supabase
    .from('org_invites')
    .select('id, org_id, role, expires_at, accepted_at, created_by, email')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  if (invite.accepted_at) return NextResponse.json({ error: 'already_accepted' }, { status: 400 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 400 })

  const inviteEmail = String(invite.email || '').toLowerCase()
  const userEmail = String(user.user.email || '').toLowerCase()
  if (inviteEmail && userEmail && inviteEmail !== userEmail)
    return NextResponse.json({ error: 'email_mismatch' }, { status: 403 })

  await supabase.from('org_members').upsert(
    {
      org_id: invite.org_id,
      user_id: user.user.id,
      role: invite.role,
      invited_by: invite.created_by || user.user.id,
    },
    { onConflict: 'org_id,user_id' }
  )

  await supabase
    .from('org_invites')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.user.id,
    })
    .eq('id', invite.id)

  const { data: organizer } = await supabase
    .from('organizer_accounts')
    .select('id')
    .eq('ops_org_id', invite.org_id)
    .eq('is_active', true)
    .maybeSingle()

  if (organizer?.id) {
    await supabase.from('account_relationships').upsert(
      {
        owner_user_id: user.user.id,
        owned_profile_id: organizer.id,
        account_type: 'organization',
        permissions: {
          can_post: true,
          can_manage_settings: invite.role === 'admin' || invite.role === 'owner',
          can_view_analytics: true,
          can_manage_content: true,
          role: invite.role,
        },
      },
      { onConflict: 'owner_user_id,owned_profile_id' }
    )
  }

  return NextResponse.json({
    ok: true,
    redirectTo: '/admin/dashboard',
    organizerAccountId: organizer?.id || null,
  })
}
