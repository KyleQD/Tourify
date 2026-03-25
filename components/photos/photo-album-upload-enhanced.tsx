"use client"

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon, Loader2, Share2, Sparkles, Hash, MapPin } from 'lucide-react'
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

// Role-based accent colors matching platform design system
const roleColors: Record<AccountType, string> = {
  general: 'from-slate-500 to-gray-500',
  artist: 'from-fuchsia-500 to-pink-500',
  venue: 'from-blue-500 to-cyan-500',
  organizer: 'from-cyan-500 to-teal-500',
  photographer: 'from-purple-500 to-blue-500'
}

export function PhotoAlbumUploadEnhanced({
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
  
  // Album settings
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [isPublic, setIsPublic] = useState(true)
  
  // Feed integration
  const [shareToFeed, setShareToFeed] = useState(true)
  const [feedCaption, setFeedCaption] = useState('')
  const [feedHashtags, setFeedHashtags] = useState('')
  const [feedLocation, setFeedLocation] = useState('')
  
  // Photographer options
  const [addWatermark, setAddWatermark] = useState(accountType === 'photographer')
  const [watermarkText, setWatermarkText] = useState('')
  const [isForSale, setIsForSale] = useState(false)
  const [salePrice, setSalePrice] = useState('')
  const [licenseType, setLicenseType] = useState<string>('personal')
  
  const { toast } = useToast()
  const gradientClass = roleColors[accountType]

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

  const createFeedPost = async (photoUrls: string[]) => {
    try {
      const hashtags = feedHashtags
        .split(/[,\s]+/)
        .filter(tag => tag.trim())
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)

      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: feedCaption || `Shared ${photoUrls.length} new photo${photoUrls.length > 1 ? 's' : ''}`,
          type: 'media',
          visibility: isPublic ? 'public' : 'followers',
          location: feedLocation,
          hashtags,
          media_urls: photoUrls
        })
      })

      if (response.ok) {
        toast({
          title: 'Shared to feed!',
          description: 'Your photos have been posted to your feed',
        })
      }
    } catch (error) {
      console.error('Error creating feed post:', error)
    }
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

      // Share to feed if enabled
      if (shareToFeed && successfulPhotos.length > 0) {
        const photoUrls = successfulPhotos.map(p => p.watermarked_url || p.preview_url)
        await createFeedPost(photoUrls)
      }

      toast({
        title: 'Upload complete!',
        description: `Successfully uploaded ${successfulPhotos.length} photo(s)${shareToFeed ? ' and shared to feed' : ''}`,
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
      {/* Header with gradient */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradientClass} p-1`}>
        <div className="rounded-xl bg-slate-900/95 backdrop-blur-sm p-6">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${gradientClass}`}>
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Upload Photos</h2>
              <p className="text-slate-300 text-sm">
                {accountType === 'photographer' ? 'Professional photography upload' : 'Share your moments'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Album Info */}
      {!albumId && (
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 shadow-xl">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Album Information</span>
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="album-title" className="text-slate-200">Album Title</Label>
                <Input
                  id="album-title"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Enter album title"
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="album-description" className="text-slate-200">Description</Label>
                <Textarea
                  id="album-description"
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  placeholder="Describe your album"
                  rows={3}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-slate-200">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
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
                <Label htmlFor="public" className="text-slate-200">Make album public</Label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Feed Integration */}
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 shadow-xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Share2 className="h-5 w-5" />
              <span>Share to Feed</span>
            </h3>
            <Switch
              checked={shareToFeed}
              onCheckedChange={setShareToFeed}
            />
          </div>
          
          {shareToFeed && (
            <div className="space-y-4 pl-7">
              <div>
                <Label htmlFor="caption" className="text-slate-200">Caption</Label>
                <Textarea
                  id="caption"
                  value={feedCaption}
                  onChange={(e) => setFeedCaption(e.target.value)}
                  placeholder="Write a caption for your post..."
                  rows={3}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="hashtags" className="text-slate-200 flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>Hashtags</span>
                </Label>
                <Input
                  id="hashtags"
                  value={feedHashtags}
                  onChange={(e) => setFeedHashtags(e.target.value)}
                  placeholder="#photography #art #music"
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-slate-200 flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </Label>
                <Input
                  id="location"
                  value={feedLocation}
                  onChange={(e) => setFeedLocation(e.target.value)}
                  placeholder="Add location"
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Photographer Options */}
      {accountType === 'photographer' && (
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 shadow-xl">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Photographer Options</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="watermark"
                  checked={addWatermark}
                  onCheckedChange={setAddWatermark}
                />
                <Label htmlFor="watermark" className="text-slate-200">Add watermark to previews</Label>
              </div>
              
              {addWatermark && (
                <div>
                  <Label htmlFor="watermark-text" className="text-slate-200">Watermark Text</Label>
                  <Input
                    id="watermark-text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder={`© ${new Date().getFullYear()}`}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="for-sale"
                  checked={isForSale}
                  onCheckedChange={setIsForSale}
                />
                <Label htmlFor="for-sale" className="text-slate-200">Make photos available for purchase</Label>
              </div>

              {isForSale && (
                <>
                  <div>
                    <Label htmlFor="price" className="text-slate-200">Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="29.99"
                      min="0"
                      step="0.01"
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="license" className="text-slate-200">License Type</Label>
                    <Select value={licenseType} onValueChange={setLicenseType}>
                      <SelectTrigger id="license" className="bg-slate-900/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
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
          </div>
        </Card>
      )}

      {/* File Upload */}
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 shadow-xl">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Upload Photos</h3>
          
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive 
                ? `border-${accountType === 'artist' ? 'fuchsia' : accountType === 'venue' ? 'blue' : accountType === 'photographer' ? 'purple' : 'slate'}-500 bg-slate-800/50` 
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'}
            `}
          >
            <input {...getInputProps()} />
            <div className={`mx-auto h-16 w-16 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-4`}>
              <Upload className="h-8 w-8 text-white" />
            </div>
            {isDragActive ? (
              <p className="text-lg text-white">Drop the photos here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2 text-white">Drag & drop photos here, or click to select</p>
                <p className="text-sm text-slate-400">
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
              <h4 className="font-medium mb-3 text-white">Selected Photos ({files.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-900/50 border border-slate-700">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Upload Progress */}
      {uploading && uploadProgress.total > 0 && (
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 shadow-xl">
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <div className="flex-1">
                <p className="font-medium text-white">Uploading photos...</p>
                <div className={`w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden`}>
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-300`}
                    style={{
                      width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`
                    }}
                  />
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  {uploadProgress.completed} of {uploadProgress.total} photos
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={uploading}
            className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
          >
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleUpload} 
          disabled={uploading || files.length === 0}
          className={`bg-gradient-to-r ${gradientClass} text-white hover:opacity-90 transition-opacity`}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
              {shareToFeed && <Share2 className="ml-2 h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

