import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'embedded'

export interface MediaFile {
  id: string
  file: File
  type: MediaType
  url?: string
  thumbnailUrl?: string
  duration?: number
  fileSize: number
  altText?: string
  metadata?: {
    width?: number
    height?: number
    format?: string
    bitrate?: number
    sampleRate?: number
  }
}

export interface UploadOptions {
  userId: string
  mediaFiles: MediaFile[]
  onProgress?: (progress: number) => void
  onFileProgress?: (fileId: string, progress: number) => void
}

export interface UploadResult {
  success: boolean
  mediaItems?: {
    id: string
    type: MediaType
    url: string
    thumbnailUrl?: string
    duration?: number
    fileSize: number
    altText?: string
    metadata?: any
  }[]
  error?: string
}

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

// Size limits (in MB)
const SIZE_LIMITS: Record<MediaType, number> = {
  image: 20,
  video: 500,
  audio: 100,
  document: 25,
  embedded: 0 // No file size for embedded content
}

// Bucket mapping
const BUCKET_MAPPING: Record<MediaType, string> = {
  image: 'post-media',
  video: 'post-media',
  audio: 'artist-music',
  document: 'post-media',
  embedded: 'post-media'
}

export class MediaUploadError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'MediaUploadError'
  }
}

export function validateMediaFile(file: File, type: MediaType): void {
  const sizeLimit = SIZE_LIMITS[type]
  const maxBytes = sizeLimit * 1024 * 1024

  // Check file size
  if (file.size > maxBytes) {
    throw new MediaUploadError(
      `${type} file size exceeds ${sizeLimit}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      'FILE_TOO_LARGE'
    )
  }

  // Check file type
  let allowedTypes: string[] = []
  switch (type) {
    case 'image':
      allowedTypes = ALLOWED_IMAGE_TYPES
      break
    case 'video':
      allowedTypes = ALLOWED_VIDEO_TYPES
      break
    case 'audio':
      allowedTypes = ALLOWED_AUDIO_TYPES
      break
    case 'document':
      allowedTypes = ALLOWED_DOCUMENT_TYPES
      break
    case 'embedded':
      return // No validation for embedded content
  }

  if (!allowedTypes.includes(file.type)) {
    throw new MediaUploadError(
      `Invalid ${type} file type. Allowed: ${allowedTypes.join(', ')}`,
      'INVALID_FILE_TYPE'
    )
  }
}

export function generateFileName(userId: string, file: File, type: MediaType): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  
  // For music files, use the artist-music bucket structure
  if (type === 'audio') {
    return `${userId}/${timestamp}-${randomId}.${extension}`
  }
  
  return `${userId}/${type}/${timestamp}-${randomId}.${extension}`
}

export async function extractMediaMetadata(file: File, type: MediaType): Promise<any> {
  const metadata: any = {}

  if (type === 'image') {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        metadata.width = img.naturalWidth
        metadata.height = img.naturalHeight
        resolve(metadata)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  if (type === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.onloadedmetadata = () => {
        metadata.width = video.videoWidth
        metadata.height = video.videoHeight
        metadata.duration = video.duration
        resolve(metadata)
      }
      video.src = URL.createObjectURL(file)
    })
  }

  if (type === 'audio') {
    return new Promise((resolve) => {
      const audio = document.createElement('audio')
      audio.onloadedmetadata = () => {
        metadata.duration = audio.duration
        resolve(metadata)
      }
      audio.src = URL.createObjectURL(file)
    })
  }

  return metadata
}

export async function createThumbnail(file: File, type: MediaType): Promise<string | null> {
  if (type === 'image') {
    return URL.createObjectURL(file)
  }

  if (type === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.onloadeddata = () => {
        canvas.width = 320
        canvas.height = 180
        ctx?.drawImage(video, 0, 0, 320, 180)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(thumbnailUrl)
      }

      video.src = URL.createObjectURL(file)
      video.currentTime = 1 // Seek to 1 second
    })
  }

  return null
}

export async function uploadMediaFiles(options: UploadOptions): Promise<UploadResult> {
  const { userId, mediaFiles, onProgress, onFileProgress } = options
  try {
    const results = []
    let totalProgress = 0

    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i]
      const { file, type, id } = mediaFile

      // Validate file
      validateMediaFile(file, type)

      // Extract metadata
      const metadata = await extractMediaMetadata(file, type)

      // Generate file name and path
      const fileName = generateFileName(userId, file, type)
      const bucketName = BUCKET_MAPPING[type]

      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw new MediaUploadError(`Upload failed: ${uploadError.message}`, 'UPLOAD_FAILED')
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      // Create thumbnail for video
      let thumbnailUrl: string | undefined
      if (type === 'video') {
        const thumbnail = await createThumbnail(file, type)
        thumbnailUrl = thumbnail || undefined
      }

      // Update progress
      totalProgress = ((i + 1) / mediaFiles.length) * 100
      onProgress?.(totalProgress)
      onFileProgress?.(id, 100)

      results.push({
        id,
        type,
        url: publicUrl,
        thumbnailUrl,
        duration: metadata.duration,
        fileSize: file.size,
        altText: mediaFile.altText,
        metadata
      })
    }

    return {
      success: true,
      mediaItems: results
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

export function detectMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('application/') || file.type.startsWith('text/')) return 'document'
  return 'document' // fallback
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Hook for media upload
export function useMediaUpload() {
  const uploadFiles = async (options: UploadOptions): Promise<UploadResult> => {
    return uploadMediaFiles(options)
  }

  const validateFiles = (files: File[]): { valid: File[], invalid: { file: File, error: string }[] } => {
    const valid: File[] = []
    const invalid: { file: File, error: string }[] = []

    files.forEach(file => {
      try {
        const type = detectMediaType(file)
        validateMediaFile(file, type)
        valid.push(file)
      } catch (error) {
        invalid.push({ file, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    })

    return { valid, invalid }
  }

  return { uploadFiles, validateFiles }
} 