import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('id')
    const svc = createServiceClient()

    const isOwner = await checkEventOwnership(svc, eventId, user.id)
    const participant = await getParticipantRole(svc, eventId, user.id)

    if (!isOwner && !participant) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    if (uploadId) {
      const { data: upload } = await svc
        .from('event_secure_uploads')
        .select('*')
        .eq('id', uploadId)
        .eq('event_id', eventId)
        .single()

      if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 })

      const canAccess = isOwner || upload.uploaded_by === user.id ||
        participant?.role === 'admin' || participant?.role === 'manager'

      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { data: signedData } = await svc.storage
        .from('documents')
        .createSignedUrl(upload.storage_path, 300) // 5 minute expiry

      if (!signedData?.signedUrl) {
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
      }

      await svc.from('secure_audit_log').insert({
        event_id: eventId,
        actor_id: user.id,
        action: 'secure_upload.accessed',
        resource_type: 'event_secure_upload',
        resource_id: uploadId,
        metadata: {
          file_name: upload.original_name,
          upload_category: upload.category,
          access_type: 'signed_url',
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      })

      return NextResponse.json({
        success: true,
        download_url: signedData.signedUrl,
        expires_in: 300,
        file_name: upload.original_name,
      })
    }

    let q = svc
      .from('event_secure_uploads')
      .select('id, event_id, uploaded_by, original_name, file_size, mime_type, category, classification, created_at, file_hash, task_message_id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (!isOwner && participant?.role !== 'admin' && participant?.role !== 'manager') {
      q = q.eq('uploaded_by', user.id)
    }

    const { data, error } = await q

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, uploads: [], _notice: 'table not yet created' })
      }
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 })
    }

    return NextResponse.json({ success: true, uploads: data || [] })
  } catch (error) {
    console.error('[Secure Uploads] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const isOwner = await checkEventOwnership(svc, eventId, user.id)
    const participant = await getParticipantRole(svc, eventId, user.id)
    if (!isOwner && !participant) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = (formData.get('category') as string) || 'general'
    const classification = (formData.get('classification') as string) || 'internal'
    const taskMessageId = formData.get('task_message_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type',
        allowed: ALLOWED_MIME_TYPES,
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex')
    const fileId = randomBytes(16).toString('hex')
    const ext = file.name.split('.').pop() || 'bin'
    const storagePath = `events/${eventId}/secure/${fileId}.${ext}`

    const { error: uploadError } = await svc.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: 'private, no-cache, no-store, must-revalidate',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Secure Uploads] Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: uploadRecord, error: insertError } = await svc
      .from('event_secure_uploads')
      .insert({
        event_id: eventId,
        uploaded_by: user.id,
        original_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        file_hash: fileHash,
        category,
        classification,
        task_message_id: taskMessageId || null,
        access_log: [{ user_id: user.id, action: 'uploaded', at: new Date().toISOString() }],
      })
      .select()
      .single()

    if (insertError) {
      await svc.storage.from('documents').remove([storagePath])
      if (insertError.code === '42P01') {
        return NextResponse.json({ error: 'table not yet created — run migration' }, { status: 501 })
      }
      console.error('[Secure Uploads] DB insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record upload' }, { status: 500 })
    }

    await svc.from('secure_audit_log').insert({
      event_id: eventId,
      actor_id: user.id,
      action: 'secure_upload.created',
      resource_type: 'event_secure_upload',
      resource_id: uploadRecord.id,
      metadata: {
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_hash: fileHash,
        category,
        classification,
        task_message_id: taskMessageId,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
    })

    if (taskMessageId) {
      const { data: task } = await svc
        .from('event_task_messages')
        .select('completed_by, recipient_ids')
        .eq('id', taskMessageId)
        .single()

      if (task) {
        const completedBy = Array.isArray(task.completed_by) ? task.completed_by : []
        if (!completedBy.includes(user.id)) completedBy.push(user.id)
        const allComplete = task.recipient_ids?.every((rid: string) => completedBy.includes(rid))

        await svc
          .from('event_task_messages')
          .update({ completed_by: completedBy, status: allComplete ? 'completed' : 'in_progress' })
          .eq('id', taskMessageId)
      }
    }

    return NextResponse.json({
      success: true,
      upload: {
        id: uploadRecord.id,
        original_name: file.name,
        file_size: file.size,
        category,
        classification,
        file_hash: fileHash,
        created_at: uploadRecord.created_at,
      },
    })
  } catch (error) {
    console.error('[Secure Uploads] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('id')
    if (!uploadId) return NextResponse.json({ error: 'Missing upload id' }, { status: 400 })

    const svc = createServiceClient()
    const isOwner = await checkEventOwnership(svc, eventId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Only event admin can delete uploads' }, { status: 403 })
    }

    const { data: upload } = await svc
      .from('event_secure_uploads')
      .select('storage_path, original_name')
      .eq('id', uploadId)
      .eq('event_id', eventId)
      .single()

    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 })

    await svc.storage.from('documents').remove([upload.storage_path])
    await svc.from('event_secure_uploads').delete().eq('id', uploadId)

    await svc.from('secure_audit_log').insert({
      event_id: eventId,
      actor_id: user.id,
      action: 'secure_upload.deleted',
      resource_type: 'event_secure_upload',
      resource_id: uploadId,
      metadata: { original_name: upload.original_name },
      ip_address: request.headers.get('x-forwarded-for') || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Secure Uploads] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

async function checkEventOwnership(svc: any, eventId: string, userId: string): Promise<boolean> {
  const { data } = await svc.from('events_v2').select('id').eq('id', eventId).eq('created_by', userId).maybeSingle()
  return !!data
}

async function getParticipantRole(svc: any, eventId: string, userId: string) {
  const { data } = await svc.from('event_participants').select('role').eq('event_id', eventId).eq('user_id', userId).maybeSingle()
  return data
}
