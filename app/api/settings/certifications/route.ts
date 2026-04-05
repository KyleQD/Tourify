import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { getPositionTemplateByKey } from '@/lib/staff/onboarding-position-templates'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth
  const { data, error } = await supabase
    .from('profile_certifications')
    .select('*')
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    items: data || [],
    position_templates: ['security-guard', 'forklift-operator', 'sound-engineer', 'lighting-tech', 'bartender', 'venue-manager'],
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth
  const body = await request.json().catch(() => null)

  if (body?.position_template_key) {
    const template = getPositionTemplateByKey(body.position_template_key)
    if (!template)
      return NextResponse.json({ error: 'Unknown position template key' }, { status: 400 })

    const requiredLabels = template.requiredCredentials
      .filter((credential) => credential.isRequired)
      .map((credential) => credential.label)
    if (requiredLabels.length === 0) return NextResponse.json({ items: [] })

    const { data: existingCerts } = await supabase
      .from('profile_certifications')
      .select('name')
      .eq('user_id', user.id)
      .in('name', requiredLabels)

    const existingNames = new Set((existingCerts || []).map((cert: any) => cert.name))
    const rowsToInsert = template.requiredCredentials
      .filter((credential) => credential.isRequired)
      .filter((credential) => !existingNames.has(credential.label))
      .map((credential) => ({
        user_id: user.id,
        name: credential.label,
        authority: credential.authority || null,
        is_public: false,
      }))

    if (rowsToInsert.length === 0) return NextResponse.json({ items: [] })

    const { data: insertedRows, error: insertError } = await supabase
      .from('profile_certifications')
      .insert(rowsToInsert)
      .select('*')

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ items: insertedRows || [] })
  }

  if (!body || !body.name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const payload = { ...body, user_id: user.id }
  const { data, error } = await supabase.from('profile_certifications').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth
  const body = await request.json().catch(() => null)
  if (!body || !body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { id, ...rest } = body
  const { data, error } = await supabase
    .from('profile_certifications')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('profile_certifications').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}


