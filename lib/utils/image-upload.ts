import { supabase } from '@/lib/supabase'

// Image upload configuration
export const IMAGE_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxDimensions: {
    width: 2048,
    height: 2048
  }
}

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
  metadata?: {
    size: number
    width: number
    height: number
    type: string
  }
}

/**
 * Validates an image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > IMAGE_CONFIG.maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${IMAGE_CONFIG.maxSizeBytes / (1024 * 1024)}MB`
    }
  }

  // Check file type
  if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${IMAGE_CONFIG.allowedTypes.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Compresses and optimizes an image file
 */
export async function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      const maxWidth = IMAGE_CONFIG.maxDimensions.width
      const maxHeight = IMAGE_CONFIG.maxDimensions.height

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/webp', // Convert to WebP for better compression
              lastModified: Date.now()
            })
            resolve(optimizedFile)
          } else {
            reject(new Error('Failed to optimize image'))
          }
        },
        'image/webp',
        0.85 // 85% quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Gets image metadata (dimensions, etc.)
 */
export async function getImageMetadata(file: File): Promise<{
  width: number
  height: number
  size: number
  type: string
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type
      })
    }
    img.onerror = () => reject(new Error('Failed to load image metadata'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Uploads an image to Supabase Storage
 */
export async function uploadVenueImage(
  file: File,
  userId: string,
  imageType: 'avatar' | 'cover' | 'gallery',
  venueId?: string
): Promise<ImageUploadResult> {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Get metadata before optimization
    const metadata = await getImageMetadata(file)

    // Optimize image
    const optimizedFile = await optimizeImage(file)

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const extension = optimizedFile.type.split('/')[1]
    const fileName = `${imageType}_${timestamp}_${random}.${extension}`
    const filePath = `${userId}/${fileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('venue-media')
      .upload(filePath, optimizedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('venue-media')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      metadata: {
        size: optimizedFile.size,
        width: metadata.width,
        height: metadata.height,
        type: optimizedFile.type
      }
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image'
    }
  }
}

/**
 * Deletes an image from Supabase Storage
 */
export async function deleteVenueImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const urlPattern = /\/storage\/v1\/object\/public\/venue-media\/(.+)$/
    const match = imageUrl.match(urlPattern)
    
    if (!match) {
      console.warn('Invalid image URL format:', imageUrl)
      return false
    }

    const filePath = match[1]

    const { error } = await supabase.storage
      .from('venue-media')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Image delete error:', error)
    return false
  }
}

/**
 * Creates a preview URL for a file
 */
export function createFilePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revokes a preview URL to free memory
 */
export function revokeFilePreview(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 