"use client"

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon, Loader2, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { uploadPhoto, uploadPhotosBatch, type AccountType } from '@/lib/utils/photo-upload'
import { useToast } from '@/hooks/use-toast'

interface PhotoAlbumUploadProps {
  accountType: AccountType
  userId: string
  albumId?: string
  eventId?: string
  onUploadComplete?: (photos: any[]) => void
  onCancel?: () => void
}

export function PhotoAlbumUpload({
  accountType,
  userId,
  albumId,
  eventId,
  onUploadComplete,
  onCancel
}: PhotoAlbumUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 })
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [isPublic, setIsPublic] = useState(true)
  const [addWatermark, setAddWatermark] = useState(accountType === 'photographer')
  const [watermarkText, setWatermarkText] = useState('')
  const [isForSale, setIsForSale] = useState(false)
  const [salePrice, setSalePrice] = useState('')
  const [licenseType, setLicenseType] = useState<string>('personal')
  
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'))
    setFiles(prev => [...prev, ...imageFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one photo to upload',
        variant: 'destructive'
      })
      return
    }

    setUploading(true)

    try {
      // Create album if needed
      let currentAlbumId = albumId
      
      if (!currentAlbumId && albumTitle) {
        const albumResponse = await fetch('/api/photos/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: albumTitle,
            description: albumDescription,
            category,
            isPublic,
            accountType,
            eventId
          })
        })

        if (!albumResponse.ok) {
          throw new Error('Failed to create album')
        }

        const { album } = await albumResponse.json()
        currentAlbumId = album.id
      }

      // Upload photos
      const results = await uploadPhotosBatch(
        files,
        {
          accountType,
          userId,
          albumId: currentAlbumId,
          addWatermark: addWatermark && accountType === 'photographer',
          watermarkText: watermarkText || `© ${new Date().getFullYear()}`,
          watermarkPosition: 'bottom-right'
        },
        (completed, total) => {
          setUploadProgress({ completed, total })
        }
      )

      // Create database records for each photo
      const photoRecords = await Promise.all(
        results.map(async (result, index) => {
          if (!result.success) {
            console.error(`Failed to upload file ${index}:`, result.error)
            return null
          }

          const photoData = {
            albumId: currentAlbumId,
            accountType,
            fullResUrl: result.fullResUrl,
            previewUrl: result.previewUrl,
            thumbnailUrl: result.thumbnailUrl,
            watermarkedUrl: result.watermarkedUrl,
            fileSize: result.metadata?.size,
            dimensions: {
              width: result.metadata?.width,
              height: result.metadata?.height
            },
            fileFormat: result.metadata?.format,
            category,
            isPublic,
            isForSale: isForSale && accountType === 'photographer',
            salePrice: isForSale ? parseFloat(salePrice) : null,
            licenseType: isForSale ? licenseType : null,
            hasWatermark: addWatermark && accountType === 'photographer',
            watermarkText: addWatermark ? watermarkText : null,
            watermarkPosition: 'bottom-right',
            eventId,
            orderIndex: index
          }

          const response = await fetch('/api/photos/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(photoData)
          })

          if (!response.ok) {
            console.error(`Failed to create photo record ${index}`)
            return null
          }

          const { photo } = await response.json()
          return photo
        })
      )

      const successfulPhotos = photoRecords.filter(p => p !== null)

      toast({
        title: 'Upload complete!',
        description: `Successfully uploaded ${successfulPhotos.length} photo(s)`,
      })

      onUploadComplete?.(successfulPhotos)
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      setUploadProgress({ completed: 0, total: 0 })
    }
  }

  return (
    <div className="space-y-6">
      {/* Album Info */}
      {!albumId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Album Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="album-title">Album Title</Label>
              <Input
                id="album-title"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="Enter album title"
              />
            </div>
            <div>
              <Label htmlFor="album-description">Description</Label>
              <Textarea
                id="album-description"
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                placeholder="Describe your album"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="behind_scenes">Behind the Scenes</SelectItem>
                  <SelectItem value="tour">Tour</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public">Make album public</Label>
            </div>
          </div>
        </Card>
      )}

      {/* Photographer Options */}
      {accountType === 'photographer' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Photographer Options</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="watermark"
                checked={addWatermark}
                onCheckedChange={setAddWatermark}
              />
              <Label htmlFor="watermark">Add watermark to previews</Label>
            </div>
            
            {addWatermark && (
              <div>
                <Label htmlFor="watermark-text">Watermark Text</Label>
                <Input
                  id="watermark-text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder={`© ${new Date().getFullYear()}`}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="for-sale"
                checked={isForSale}
                onCheckedChange={setIsForSale}
              />
              <Label htmlFor="for-sale">Make photos available for purchase</Label>
            </div>

            {isForSale && (
              <>
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="29.99"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="license">License Type</Label>
                  <Select value={licenseType} onValueChange={setLicenseType}>
                    <SelectTrigger id="license">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Use</SelectItem>
                      <SelectItem value="commercial">Commercial Use</SelectItem>
                      <SelectItem value="editorial">Editorial Use</SelectItem>
                      <SelectItem value="exclusive">Exclusive Rights</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* File Upload */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload Photos</h3>
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg">Drop the photos here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag & drop photos here, or click to select</p>
              <p className="text-sm text-muted-foreground">
                Supported formats: JPG, PNG, WebP, HEIC
                {accountType === 'general' && ' (max 5MB per photo)'}
                {accountType !== 'general' && ' (max 100MB per photo)'}
              </p>
            </div>
          )}
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Selected Photos ({files.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Upload Progress */}
      {uploading && uploadProgress.total > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div className="flex-1">
              <p className="font-medium">Uploading photos...</p>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {uploadProgress.completed} of {uploadProgress.total} photos
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={uploading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

