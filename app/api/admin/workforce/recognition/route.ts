import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { WorkforceRecognitionService, recognitionError } from '@/lib/services/workforce-recognition.service'
const text = z.string().trim().min(10).max(2000)
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('verify'), assignment_id: z.string().uuid(), endorsement: text, evidence: text }).strict(),
  z.object({ action: z.literal('revoke'), credit_id: z.string().uuid(), reason: text }).strict(),
])
const employerSchema = z.object({ entity_type: z.enum(['venue', 'organization', 'artist']), entity_id: z.string().uuid() })
export async function GET(request: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = employerSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Select an employer' }, { status: 400 })
  try {
    return NextResponse.json(await new WorkforceRecognitionService(db).managerQueue(user.id, parsed.data.entity_type, parsed.data.entity_id),
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const failure = recognitionError(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
export async function POST(request: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a valid assignment and 10–2000 character attestation/evidence, or a credit and revocation reason.' }, { status: 400 })
  try {
    const service = new WorkforceRecognitionService(db)
    if (parsed.data.action === 'verify') {
      const creditId = await service.verify(parsed.data.assignment_id, parsed.data.endorsement, parsed.data.evidence)
      return NextResponse.json({ success: true, credit_id: creditId })
    }
    await service.revoke(parsed.data.credit_id, parsed.data.reason)
    return NextResponse.json({ success: true })
  } catch (error) {
    const failure = recognitionError(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
