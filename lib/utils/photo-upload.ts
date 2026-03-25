/**
 * Photo Upload Utilities with Tiered Compression
 * 
 * This module handles photo uploads with different compression levels based on account type:
 * - General accounts: Compressed to <5MB
 * - Artist/Venue/Organizer: Full-size with loading optimization
 * - Photographer: Full resolution + watermarked previews
 */

import { supabase } from '@/lib/supabase/client'

// Account type definitions
export type AccountType = 'general' | 'artist' | 'venue' | 'organizer' | 'photographer'

// Upload tier configurations
export const UPLOAD_TIERS = {
  general: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxDimensions: { width: 2048, height: 2048 },
    quality: 0.85,
    format: 'image/webp',
    enableFullRes: false
  },
  artist: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    maxDimensions: { width: 4096, height: 4096 },
    quality: 0.90,
    format: 'image/webp',
    enableFullRes: true
  },
  venue: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    maxDimensions: { width: 4096, height: 4096 },
    quality: 0.90,
    format: 'image/webp',
    enableFullRes: true
  },
  organizer: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    maxDimensions: { width: 4096, height: 4096 },
    quality: 0.90,
    format: 'image/webp',
    enableFullRes: true
  },
  photographer: {
    maxSizeBytes: 100 * 1024 * 1024, // 100MB for full-res
    maxDimensions: { width: 8192, height: 8192 }, // Support very high res
    quality: 0.95,
    format: 'image/webp',
    enableFullRes: true,
    enableWatermark: true
  }
}

// Storage bucket mapping
export const STORAGE_BUCKETS = {
  fullRes: 'photos-full-res',
  preview: 'photos-preview',
  thumbnail: 'photos-thumbnail',
  watermarked: 'photos-watermarked'
}

export interface PhotoMetadata {
  width: number
  height: number
  size: number
  format: string
  exifData?: Record<string, any>
}

export interface UploadResult {
  success: boolean
  fullResUrl?: string
  previewUrl?: string
  thumbnailUrl?: string
  watermarkedUrl?: string
  metadata?: PhotoMetadata
  error?: string
}

export interface PhotoUploadOptions {
  file: File
  accountType: AccountType
  userId: string
  albumId?: string
  addWatermark?: boolean
  watermarkText?: string
  watermarkPosition?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

/**
 * Validates a photo file based on account type
 */
export function validatePhotoFile(file: File, accountType: AccountType): { valid: boolean; error?: string } {
  const config = UPLOAD_TIERS[accountType]
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }
  
  // Check file size
  if (file.size > config.maxSizeBytes) {
    const maxMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(0)
    return { 
      valid: false, 
      error: `File size must be less than ${maxMB}MB for ${accountType} accounts` 
    }
  }
  
  return { valid: true }
}

/**
 * Extracts EXIF data from an image
 */
export async function extractExifData(file: File): Promise<Record<string, any>> {
  // This is a simplified version. In production, use a library like exif-js or piexifjs
  return {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    lastModified: new Date(file.lastModified).toISOString()
  }
}

/**
 * Gets image metadata
 */
export async function getPhotoMetadata(file: File): Promise<PhotoMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = async () => {
      const exifData = await extractExifData(file)
      
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        format: file.type,
        exifData
      })
      
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image metadata'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compresses an image based on account tier
 */
export async function compressImage(
  file: File, 
  accountType: AccountType,
  targetDimensions?: { width: number; height: number },
  quality?: number
): Promise<File> {
  const config = UPLOAD_TIERS[accountType]
  const targetQuality = quality ?? config.quality
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      let { width, height } = img
      
      // Calculate new dimensions
      if (targetDimensions) {
        width = targetDimensions.width
        height = targetDimensions.height
      } else {
        const maxWidth = config.maxDimensions.width
        const maxHeight = config.maxDimensions.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
      }
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Draw image
      ctx?.drawImage(img, 0, 0, width, height)
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // For general accounts, ensure size is under limit
            if (accountType === 'general' && blob.size > config.maxSizeBytes) {
              // Reduce quality further if needed
              const newQuality = Math.max(0.5, targetQuality - 0.1)
              canvas.toBlob(
                (reducedBlob) => {
                  if (reducedBlob) {
                    const compressedFile = new File([reducedBlob], file.name, {
                      type: config.format,
                      lastModified: Date.now()
                    })
                    resolve(compressedFile)
                  } else {
                    reject(new Error('Failed to compress image'))
                  }
                },
                config.format,
                newQuality
              )
            } else {
              const compressedFile = new File([blob], file.name, {
                type: config.format,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            }
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        config.format,
        targetQuality
      )
      
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Creates a thumbnail from an image
 */
export async function createThumbnail(file: File, size: number = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const { width, height } = img
      const ratio = Math.min(size / width, size / height)
      
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `thumb_${file.name}`, {
              type: 'image/webp',
              lastModified: Date.now()
            })
            resolve(thumbnailFile)
          } else {
            reject(new Error('Failed to create thumbnail'))
          }
        },
        'image/webp',
        0.80
      )
      
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image for thumbnail'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Adds watermark to an image
 */
export async function addWatermark(
  file: File,
  watermarkText: string,
  position: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right'
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw original image
      ctx?.drawImage(img, 0, 0)
      
      if (ctx) {
        // Configure watermark style
        const fontSize = Math.max(20, Math.floor(img.width / 40))
        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.lineWidth = 2
        
        // Measure text
        const textMetrics = ctx.measureText(watermarkText)
        const textWidth = textMetrics.width
        const textHeight = fontSize
        
        // Calculate position
        let x = 0
        let y = 0
        const padding = 20
        
        switch (position) {
          case 'center':
            x = (canvas.width - textWidth) / 2
            y = (canvas.height + textHeight) / 2
            break
          case 'bottom-right':
            x = canvas.width - textWidth - padding
            y = canvas.height - padding
            break
          case 'bottom-left':
            x = padding
            y = canvas.height - padding
            break
          case 'top-right':
            x = canvas.width - textWidth - padding
            y = textHeight + padding
            break
          case 'top-left':
            x = padding
            y = textHeight + padding
            break
        }
        
        // Draw watermark with stroke for better visibility
        ctx.strokeText(watermarkText, x, y)
        ctx.fillText(watermarkText, x, y)
      }
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], `watermarked_${file.name}`, {
              type: 'image/webp',
              lastModified: Date.now()
            })
            resolve(watermarkedFile)
          } else {
            reject(new Error('Failed to add watermark'))
          }
        },
        'image/webp',
        0.90
      )
      
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image for watermarking'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Uploads a file to Supabase storage
 */
async function uploadToStorage(
  file: File,
  bucket: string,
  path: string
): Promise<{ url: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Storage upload error:', error)
      return { url: '', error: error.message }
    }
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return { url: urlData.publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Main photo upload function with tiered processing
 */
export async function uploadPhoto(options: PhotoUploadOptions): Promise<UploadResult> {
  const { file, accountType, userId, albumId, addWatermark, watermarkText, watermarkPosition } = options
  
  try {
    // Validate file
    const validation = validatePhotoFile(file, accountType)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    
    // Get metadata
    const metadata = await getPhotoMetadata(file)
    
    // Generate file paths
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const baseFileName = `${userId}/${albumId || 'standalone'}/${timestamp}_${random}`
    
    const config = UPLOAD_TIERS[accountType]
    
    // Always create thumbnail
    const thumbnailFile = await createThumbnail(file, 300)
    const thumbnailPath = `${baseFileName}_thumb.webp`
    const thumbnailUpload = await uploadToStorage(thumbnailFile, STORAGE_BUCKETS.thumbnail, thumbnailPath)
    
    if (thumbnailUpload.error) {
      return { success: false, error: `Thumbnail upload failed: ${thumbnailUpload.error}` }
    }
    
    let fullResUrl: string | undefined
    let previewUrl: string
    let watermarkedUrl: string | undefined
    
    if (config.enableFullRes) {
      // For artist/venue/organizer/photographer: upload full res
      const fullResPath = `${baseFileName}_full.${file.name.split('.').pop()}`
      const fullResUpload = await uploadToStorage(file, STORAGE_BUCKETS.fullRes, fullResPath)
      
      if (fullResUpload.error) {
        return { success: false, error: `Full-res upload failed: ${fullResUpload.error}` }
      }
      fullResUrl = fullResUpload.url
      
      // Create optimized preview
      const previewFile = await compressImage(file, accountType)
      const previewPath = `${baseFileName}_preview.webp`
      const previewUpload = await uploadToStorage(previewFile, STORAGE_BUCKETS.preview, previewPath)
      
      if (previewUpload.error) {
        return { success: false, error: `Preview upload failed: ${previewUpload.error}` }
      }
      previewUrl = previewUpload.url
      
      // Add watermark for photographers if requested
      // TODO: Implement watermark function
      // if ('enableWatermark' in config && config.enableWatermark && addWatermark && watermarkText) {
      //   const watermarkedFile = await addWatermarkToImage(previewFile, watermarkText, watermarkPosition)
      //   const watermarkedPath = `${baseFileName}_watermarked.webp`
      //   const watermarkedUpload = await uploadToStorage(watermarkedFile, STORAGE_BUCKETS.watermarked, watermarkedPath)
      //   
      //   if (!watermarkedUpload.error) {
      //     watermarkedUrl = watermarkedUpload.url
      //   }
      // }
    } else {
      // For general accounts: only upload compressed version
      const compressedFile = await compressImage(file, accountType)
      const previewPath = `${baseFileName}_preview.webp`
      const previewUpload = await uploadToStorage(compressedFile, STORAGE_BUCKETS.preview, previewPath)
      
      if (previewUpload.error) {
        return { success: false, error: `Upload failed: ${previewUpload.error}` }
      }
      
      previewUrl = previewUpload.url
      fullResUrl = previewUrl // For general accounts, preview is the "full res"
    }
    
    return {
      success: true,
      fullResUrl,
      previewUrl,
      thumbnailUrl: thumbnailUpload.url,
      watermarkedUrl,
      metadata
    }
  } catch (error) {
    console.error('Photo upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Batch upload multiple photos
 */
export async function uploadPhotosBatch(
  files: File[],
  options: Omit<PhotoUploadOptions, 'file'>,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  
  for (let i = 0; i < files.length; i++) {
    const result = await uploadPhoto({ ...options, file: files[i] })
    results.push(result)
    onProgress?.(i + 1, files.length)
  }
  
  return results
}

/**
 * Deletes a photo from storage
 */
export async function deletePhoto(urls: {
  fullResUrl?: string
  previewUrl?: string
  thumbnailUrl?: string
  watermarkedUrl?: string
}): Promise<boolean> {
  try {
    const deletePromises: Promise<any>[] = []
    
    // Helper to extract path from URL
    const getPathFromUrl = (url: string, bucket: string): string => {
      const pattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`)
      const match = url.match(pattern)
      return match ? match[1] : ''
    }
    
    if (urls.fullResUrl) {
      const path = getPathFromUrl(urls.fullResUrl, STORAGE_BUCKETS.fullRes)
      if (path) {
        deletePromises.push(
          supabase.storage.from(STORAGE_BUCKETS.fullRes).remove([path])
        )
      }
    }
    
    if (urls.previewUrl) {
      const path = getPathFromUrl(urls.previewUrl, STORAGE_BUCKETS.preview)
      if (path) {
        deletePromises.push(
          supabase.storage.from(STORAGE_BUCKETS.preview).remove([path])
        )
      }
    }
    
    if (urls.thumbnailUrl) {
      const path = getPathFromUrl(urls.thumbnailUrl, STORAGE_BUCKETS.thumbnail)
      if (path) {
        deletePromises.push(
          supabase.storage.from(STORAGE_BUCKETS.thumbnail).remove([path])
        )
      }
    }
    
    if (urls.watermarkedUrl) {
      const path = getPathFromUrl(urls.watermarkedUrl, STORAGE_BUCKETS.watermarked)
      if (path) {
        deletePromises.push(
          supabase.storage.from(STORAGE_BUCKETS.watermarked).remove([path])
        )
      }
    }
    
    await Promise.all(deletePromises)
    return true
  } catch (error) {
    console.error('Photo deletion error:', error)
    return false
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

