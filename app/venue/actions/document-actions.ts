'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Create Supabase client per action (no top-level await)

const uploadSchema = z.object({
  venueId: z.string().uuid(),
  name: z.string().min(1),
  documentType: z.enum(['contract','rider','insurance','license','safety','marketing','other']).default('other'),
  isPublic: z.boolean().default(false)
})

export async function uploadVenueDocument(input: { venueId: string; file: File; name?: string; documentType?: string; isPublic?: boolean; folderId?: string; description?: string }) {
  const supabase = await createClient()
  const parsed = uploadSchema.safeParse({ venueId: input.venueId, name: input.name || input.file.name, documentType: (input.documentType as any) || 'other', isPublic: !!input.isPublic })
  if (!parsed.success) return { success: false, error: 'Invalid input' }
  const { venueId, name, documentType, isPublic } = parsed.data

  // 1) Upload to storage (bucket: venue-documents) under venueId/
  const arrayBuffer = await input.file.arrayBuffer()
  const fileBytes = new Uint8Array(arrayBuffer)
  const ext = input.file.type.split('/')[1] || 'bin'
  const storagePath = `${venueId}/${Date.now()}_${name}`
  const { error: uploadErr, data: uploaded } = await supabase.storage.from('venue-documents').upload(storagePath, fileBytes, {
    contentType: input.file.type,
    upsert: false
  })
  if (uploadErr) return { success: false, error: uploadErr.message }

  // 2) Insert metadata row
  const { data: { user } } = await supabase.auth.getUser()
  const { error: insertErr } = await supabase.from('venue_documents').insert({
    venue_id: venueId,
    name,
    description: null,
    document_type: documentType,
    file_url: uploaded?.path || storagePath,
    file_size: input.file.size,
    mime_type: input.file.type,
    is_public: isPublic,
    uploaded_by: user?.id || null
  })
  if (insertErr) return { success: false, error: insertErr.message }

  revalidatePath('/venue/documents')
  return { success: true }
}

export async function deleteVenueDocument(docId: string) {
  const supabase = await createClient()
  // Fetch document to delete storage object too
  const { data: doc, error } = await supabase.from('venue_documents').select('*').eq('id', docId).single()
  if (error || !doc) return { success: false, error: error?.message || 'Not found' }

  const { error: delMetaErr } = await supabase.from('venue_documents').delete().eq('id', docId)
  if (delMetaErr) return { success: false, error: delMetaErr.message }

  // Best-effort delete from storage
  await supabase.storage.from('venue-documents').remove([doc.file_url])
  revalidatePath('/venue/documents')
  return { success: true }
}

