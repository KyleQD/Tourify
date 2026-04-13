import { supabase } from '@/lib/supabase/client'
export type MediaType = 'avatar' | 'post' | 'venue' | 'event' | 'document'

export interface UploadOptions {
  userId: string
  file: File
  mediaType: MediaType
  maxSizeMB?: number
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  path?: string
}

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

// Default size limits (in MB)
const DEFAULT_SIZE_LIMITS: Record<MediaType, number> = {
  avatar: 10,
  post: 50,
  venue: 50,
  event: 50,
  document: 25
}

// Bucket mapping
const BUCKET_MAPPING: Record<MediaType, string> = {
  avatar: 'avatars',
  post: 'post-media',
  venue: 'venue-media',
  event: 'event-media',
  document: 'documents'
}

export class MediaUploadError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'MediaUploadError'
  }
}

export function validateFile(file: File, mediaType: MediaType, maxSizeMB?: number): void {
  const sizeLimit = maxSizeMB || DEFAULT_SIZE_LIMITS[mediaType]
  const maxBytes = sizeLimit * 1024 * 1024

  // Check file size
  if (file.size > maxBytes) {
    throw new MediaUploadError(
      `File size exceeds ${sizeLimit}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      'FILE_TOO_LARGE'
    )
  }

  // Check file type
  if (mediaType === 'document') {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      throw new MediaUploadError(
        'Invalid document type. Allowed: PDF, DOC, DOCX, TXT',
        'INVALID_FILE_TYPE'
      )
    }
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new MediaUploadError(
        'Invalid image type. Allowed: JPG, PNG, GIF, WebP',
        'INVALID_FILE_TYPE'
      )
    }
  }
}

export function generateFileName(userId: string, file: File, mediaType: MediaType): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  
  switch (mediaType) {
    case 'avatar':
      return `${userId}/avatar-${timestamp}.${extension}`
    case 'post':
      return `${userId}/post-${timestamp}-${randomId}.${extension}`
    case 'venue':
      return `${userId}/venue-${timestamp}-${randomId}.${extension}`
    case 'event':
      return `${userId}/event-${timestamp}-${randomId}.${extension}`
    case 'document':
      return `${userId}/doc-${timestamp}-${randomId}.${extension}`
    default:
      return `${userId}/file-${timestamp}-${randomId}.${extension}`
  }
}

export async function uploadMedia(options: UploadOptions): Promise<UploadResult> {
  const { userId, file, mediaType, maxSizeMB, onProgress } = options
  try {
    // Validate file
    validateFile(file, mediaType, maxSizeMB)

    // Generate file path
    const fileName = generateFileName(userId, file, mediaType)
    const bucketName = BUCKET_MAPPING[mediaType]

    console.log(`Uploading ${mediaType} file:`, fileName, 'to bucket:', bucketName)

    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new MediaUploadError(`Upload failed: ${uploadError.message}`, 'UPLOAD_FAILED')
    }

    console.log('Upload successful:', uploadData)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log('Public URL generated:', publicUrl)

    return {
      success: true,
      url: publicUrl,
      path: fileName
    }

  } catch (error) {
    console.error('Media upload error:', error)
    
    if (error instanceof MediaUploadError) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

export async function deleteMedia(path: string, mediaType: MediaType): Promise<boolean> {
  const bucketName = BUCKET_MAPPING[mediaType]

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    console.log('File deleted successfully:', path)
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

// React hook for media uploads
export function useMediaUpload() {
  const uploadFile = async (options: UploadOptions): Promise<UploadResult> => {
    return uploadMedia(options)
  }

  const deleteFile = async (path: string, mediaType: MediaType): Promise<boolean> => {
    return deleteMedia(path, mediaType)
  }

  return {
    uploadFile,
    deleteFile,
    validateFile,
    MediaUploadError
  }
}

// Helper function to extract file path from URL
export function extractFilePathFromUrl(url: string, bucketName: string): string | null {
  try {
    // Supabase storage URLs typically follow this pattern:
    // https://project.supabase.co/storage/v1/object/public/bucket-name/path/to/file
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === bucketName)
    
    if (bucketIndex === -1) return null
    
    return pathParts.slice(bucketIndex + 1).join('/')
  } catch {
    return null
  }
} 