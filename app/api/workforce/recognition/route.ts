import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { WorkforceRecognitionService, recognitionError } from '@/lib/services/workforce-recognition.service'
const userSchema = z.string().uuid()
export async function GET(request: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = userSchema.safeParse(request.nextUrl.searchParams.get('user_id') ?? user.id)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  try {
    const profile = await new WorkforceRecognitionService(db).profile(parsed.data)
    return NextResponse.json(profile, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const failure = recognitionError(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
export async function PATCH(request: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = z.object({ is_public: z.boolean() }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  try {
    await new WorkforceRecognitionService(db).visibility(user.id, parsed.data.is_public)
    return NextResponse.json({ success: true })
  } catch (error) {
    const failure = recognitionError(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
