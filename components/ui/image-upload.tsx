import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface ImageUploadProps {
  type: 'avatar' | 'header'
  currentImageUrl?: string
  onImageChange: (url: string) => void
  className?: string
}

export function ImageUpload({ type, currentImageUrl, onImageChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  

  const isAvatar = type === 'avatar'
  const aspectRatio = isAvatar ? 'aspect-square' : 'aspect-[3/1]'
  const maxSize = isAvatar ? 4 * 1024 * 1024 : 4 * 1024 * 1024 // 4MB for both avatar and header
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']

  const handleFileSelect = async (file: File) => {
    if (!file || !user) return

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      alert(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload using server-side API
    setUploading(true)
    try {
      console.log('Starting upload for user:', user.id)
      console.log('File details:', { name: file.name, size: file.size, type: file.type })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/upload-profile-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        console.error('Upload failed:', result.error)
        alert(`Failed to upload image: ${result.error}`)
        return
      }

      console.log('Upload successful:', result.url)
      onImageChange(result.url)
      setPreviewUrl(null)
    } catch (error) {
      console.error('Upload error:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
              alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const removeImage = async () => {
    if (!user) return

    setUploading(true)
    try {
      // Update profile to remove image URL using server-side API
      const response = await fetch('/api/profile/update-appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileColors: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
          selectedTheme: 'emerald',
          darkMode: true,
          animations: true,
          glowEffects: true,
          profileImages: {
            avatarUrl: type === 'avatar' ? '' : currentImageUrl || '',
            headerUrl: type === 'header' ? '' : currentImageUrl || ''
          }
        }),
      })

      const result = await response.json()

      if (!result.success) {
        console.error('Error removing image:', result.error)
        alert('Failed to remove image. Please try again.')
        return
      }

      onImageChange('')
    } catch (error) {
      console.error('Error removing image:', error)
      alert('Failed to remove image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const displayImage = previewUrl || currentImageUrl

  return (
    <Card className={`bg-white/10 backdrop-blur border border-white/20 rounded-3xl ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-400" />
            <Label className="text-white font-semibold text-lg">
              {isAvatar ? 'Profile Picture' : 'Header Photo'}
            </Label>
          </div>

          <div
            className={`
              relative ${aspectRatio} rounded-2xl border-2 border-dashed transition-all duration-200
              ${dragActive ? 'border-purple-400 bg-purple-400/10' : 'border-white/20 bg-white/5'}
              ${displayImage ? 'border-solid' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {displayImage ? (
              <>
                <img
                  src={displayImage}
                  alt={isAvatar ? 'Profile picture' : 'Header photo'}
                  className="w-full h-full object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-2xl flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeImage}
                  disabled={uploading}
                  className="absolute top-2 right-2 bg-red-500/20 backdrop-blur border-red-500/30 text-red-400 hover:bg-red-500/30"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <ImageIcon className="h-12 w-12 text-white/40 mb-4" />
                <p className="text-white/60 text-sm mb-2">
                  {isAvatar ? 'Upload your profile picture' : 'Upload a header photo'}
                </p>
                <p className="text-white/40 text-xs">
                  Drag & drop or click to browse
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-4 bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
                  <p className="text-white text-sm">Uploading...</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-white/40 space-y-1">
            <p>• Supported formats: JPEG, PNG, WebP</p>
            <p>• Max size: {maxSize / (1024 * 1024)}MB</p>
            {isAvatar && <p>• Recommended: Square image (1:1 ratio)</p>}
            {!isAvatar && <p>• Recommended: Wide image (3:1 ratio)</p>}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  )
} 