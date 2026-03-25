"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

export interface FeedPhotoUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload a photo for feed posts using the existing post-media bucket
 * This is simpler than the full photo upload system and uses the established storage
 */
export async function uploadFeedPhoto(
  file: File,
  userId: string
): Promise<FeedPhotoUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' }
    }

    // Validate file size (5MB limit for feed posts)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `feed-${timestamp}-${randomId}.${extension}`
    
    // Upload to post-media bucket
    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(`${userId}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { success: false, error: `Storage upload error: ${error.message}` }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(data.path)

    return {
      success: true,
      url: publicUrl
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Upload multiple photos for feed posts
 */
export async function uploadFeedPhotos(
  files: File[],
  userId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
  const urls: string[] = []
  const errors: string[] = []
  let completed = 0

  for (const file of files) {
    const result = await uploadFeedPhoto(file, userId)
    
    if (result.success && result.url) {
      urls.push(result.url)
    } else {
      errors.push(result.error || 'Upload failed')
    }
    
    completed++
    onProgress?.(completed, files.length)
  }

  return {
    success: urls.length > 0,
    urls,
    errors
  }
}

/**
 * Delete a feed photo from storage
 */
export async function deleteFeedPhoto(url: string): Promise<boolean> {
  try {
    // Extract path from URL
    const urlParts = url.split('/')
    const bucketIndex = urlParts.findIndex(part => part === 'post-media')
    
    if (bucketIndex === -1) {
      return false
    }
    
    const path = urlParts.slice(bucketIndex + 1).join('/')
    
    const { error } = await supabase.storage
      .from('post-media')
      .remove([path])
    
    return !error
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}
