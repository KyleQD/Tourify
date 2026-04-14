"use client"

import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Upload,
  Music2,
  X,
  FileAudio,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  Volume2,
  Settings,
  ShieldCheck
} from 'lucide-react'
import Image from 'next/image'

interface EnhancedMusicUploaderProps {
  onUploadComplete: (trackData: any) => void
  onCancel: () => void
  isUploading?: boolean
  progress?: number
}

interface UploadFile {
  file: File
  preview?: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export function EnhancedMusicUploader({ onUploadComplete, onCancel, isUploading = false, progress = 0 }: EnhancedMusicUploaderProps) {
  const [musicFile, setMusicFile] = useState<UploadFile | null>(null)
  const [coverFile, setCoverFile] = useState<UploadFile | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    type: 'single' as 'single' | 'album' | 'ep' | 'mixtape',
    release_date: '',
    is_public: true,
    is_featured: false,
    tags: [] as string[],
    lyrics: '',
    spotify_url: '',
    apple_music_url: '',
    soundcloud_url: '',
    youtube_url: '',
    upload_variant: 'full' as 'full' | 'snippet',
    full_track_url: '',
    is_for_sale: false,
    buy_url: '',
    price: '',
    currency: 'USD',
    allow_download: false,
    rights_confirmed: false
  })
  const [newTag, setNewTag] = useState('')
  const [shareAsPost, setShareAsPost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [autoDetected, setAutoDetected] = useState<{ title?: string; artist?: string; album?: string; genre?: string; year?: number } | null>(null)

  // Music file dropzone
  async function parseID3v1(file: File) {
    try {
      const size = file.size
      if (size < 128) return null
      const tagSlice = file.slice(size - 128, size)
      const buffer = await tagSlice.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      // Check header "TAG"
      if (bytes[0] !== 0x54 || bytes[1] !== 0x41 || bytes[2] !== 0x47) return null
      const decoder = new TextDecoder('latin1')
      const title = decoder.decode(bytes.slice(3, 33)).replace(/\u0000/g, '').trim()
      const artist = decoder.decode(bytes.slice(33, 63)).replace(/\u0000/g, '').trim()
      const album = decoder.decode(bytes.slice(63, 93)).replace(/\u0000/g, '').trim()
      const yearStr = decoder.decode(bytes.slice(93, 97)).replace(/\u0000/g, '').trim()
      const genreIdx = bytes[127]
      const year = parseInt(yearStr, 10)
      const id3v1Genres: string[] = [
        'Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop','Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock','Techno','Industrial'
      ]
      const genre = id3v1Genres[genreIdx] || undefined
      return { title, artist, album, year: isNaN(year) ? undefined : year, genre }
    } catch {
      return null
    }
  }

  const onMusicDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // Validate audio file
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select a valid audio file')
        return
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('File size must be less than 100MB')
        return
      }

      setMusicFile({
        file,
        progress: 0,
        status: 'completed'
      })
      // Immediate auto-start upload using current form defaults
      const filenameTitle = file.name.replace(/\.[^.]+$/, '').replace(/[._-]+/g, ' ').trim()
      const initial = {
        ...formData,
        title: formData.title || filenameTitle,
      }
      onUploadComplete({
        ...initial,
        musicFile: file,
        coverFile: coverFile?.file,
        shareAsPost,
        postContent,
        rights_confirmed: initial.rights_confirmed,
        rights_confirmed_at: initial.rights_confirmed ? new Date().toISOString() : null,
        metadata: {
          preview_type: initial.upload_variant === 'snippet' ? 'file' : 'full',
          full_track_url: initial.full_track_url || undefined,
          buy_url: initial.is_for_sale ? initial.buy_url : undefined,
          price: initial.is_for_sale ? initial.price : undefined,
          currency: initial.is_for_sale ? initial.currency : undefined,
          allow_download: initial.allow_download || false,
        }
      })
      // Attempt to parse ID3v1 tags (no external deps)
      ;(async () => {
        const meta = await parseID3v1(file)
        if (meta) {
          setAutoDetected(meta)
          setFormData(prev => ({
            ...prev,
            title: prev.title || meta.title || prev.title,
            genre: prev.genre || meta.genre || prev.genre,
            release_date: prev.release_date || (meta.year ? `${meta.year}-01-01` : prev.release_date)
          }))
        }
      })()
    }
  }, [coverFile, formData, onUploadComplete, postContent, shareAsPost])

  const { getRootProps: getMusicRootProps, getInputProps: getMusicInputProps, isDragActive: isMusicDragActive } = useDropzone({
    onDrop: onMusicDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg']
    },
    maxFiles: 1,
    disabled: !!musicFile
  })

  // Cover art dropzone
  const onCoverDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image size must be less than 10MB')
        return
      }

      const preview = URL.createObjectURL(file)
      setCoverFile({
        file,
        preview,
        progress: 0,
        status: 'uploading'
      })
    }
  }, [])

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps, isDragActive: isCoverDragActive } = useDropzone({
    onDrop: onCoverDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: !!coverFile
  })

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async () => {
    if (!musicFile?.file || !formData.title.trim()) {
      toast.error('Please provide a music file and title')
      return
    }

    if (!formData.rights_confirmed) {
      toast.error('You must confirm that you own the rights to this content before uploading')
      return
    }

    try {
      const trackData = {
        ...formData,
        musicFile: musicFile.file,
        coverFile: coverFile?.file,
        shareAsPost,
        postContent,
        rights_confirmed: true,
        rights_confirmed_at: new Date().toISOString(),
        metadata: {
          preview_type: formData.upload_variant === 'snippet' ? 'file' : 'full',
          full_track_url: formData.full_track_url || undefined,
          buy_url: formData.is_for_sale ? formData.buy_url : undefined,
          price: formData.is_for_sale ? formData.price : undefined,
          currency: formData.is_for_sale ? formData.currency : undefined,
          allow_download: formData.allow_download || false,
        }
      }

      onUploadComplete(trackData)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload track')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Upload New Track</h1>
              <p className="text-gray-400">Share your music with the world</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - File Uploads */}
          <div className="xl:col-span-1 space-y-6">
            {/* Music File Upload */}
            <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Music2 className="h-5 w-5 text-purple-400" />
                  {formData.upload_variant === 'snippet' ? 'Snippet File' : 'Music File'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Variant */}
                <div>
                  <Label className="text-gray-300 font-medium">Upload Type</Label>
                  <Select value={formData.upload_variant} onValueChange={(v: 'full' | 'snippet') => setFormData(prev => ({ ...prev, upload_variant: v }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                      <SelectItem value="full">Full Track</SelectItem>
                      <SelectItem value="snippet">Snippet Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!musicFile ? (
                  <div
                    {...getMusicRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                      isMusicDragActive 
                        ? 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                        : 'border-slate-600 hover:border-purple-500/50 hover:bg-slate-800/70'
                    }`}
                  >
                    <input {...getMusicInputProps()} />
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-3">
                      <FileAudio className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-white font-semibold mb-1">
                      {isMusicDragActive ? 'Drop file here' : 'Drag & drop music'}
                    </p>
                    <p className="text-gray-400 text-xs mb-3">
                      MP3, WAV, FLAC, AAC, M4A, OGG (max 100MB)
                    </p>
                    <Button variant="outline" size="sm" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-purple-500 rounded-xl">
                      <Upload className="h-3 w-3 mr-2" />
                      Choose File
                    </Button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <FileAudio className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{musicFile.file.name}</p>
                          <p className="text-green-400 text-xs">
                            {formatFileSize(musicFile.file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMusicFile(null)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {(isUploading || progress > 0) && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">Uploading...</span>
                          <span className="text-purple-400 font-semibold">{Math.max(progress, musicFile.progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${Math.max(progress, musicFile.progress)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {autoDetected && (
                      <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="h-3 w-3 text-blue-400" />
                          <span className="text-xs font-medium text-blue-300">Auto-detected</span>
                        </div>
                        <div className="text-xs text-blue-200">
                          {autoDetected.title && <div>Title: {autoDetected.title}</div>}
                          {autoDetected.genre && <div>Genre: {autoDetected.genre}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cover Art Upload */}
            <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-400" />
                  Cover Art
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!coverFile ? (
                  <div
                    {...getCoverRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                      isCoverDragActive 
                        ? 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                        : 'border-slate-600 hover:border-purple-500/50 hover:bg-slate-800/70'
                    }`}
                  >
                    <input {...getCoverInputProps()} />
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-3">
                      <ImageIcon className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-white font-semibold mb-1">
                      {isCoverDragActive ? 'Drop image here' : 'Drag & drop cover'}
                    </p>
                    <p className="text-gray-400 text-xs mb-3">
                      JPG, PNG, GIF, WebP (max 10MB)
                    </p>
                    <Button variant="outline" size="sm" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-purple-500 rounded-xl">
                      <Upload className="h-3 w-3 mr-2" />
                      Choose Image
                    </Button>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-700 shadow-lg">
                          {coverFile.preview && (
                            <Image
                              src={coverFile.preview}
                              alt="Cover preview"
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{coverFile.file.name}</p>
                          <p className="text-purple-400 text-xs">
                            {formatFileSize(coverFile.file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCoverFile(null)}
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Track Details */}
          <div className="xl:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-purple-400" />
                  Track Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-gray-300 font-medium">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter track title..."
                      className="bg-slate-800 border-slate-700 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-300 font-medium">Type</Label>
                    <Select value={formData.type} onValueChange={(value: 'single' | 'album' | 'ep' | 'mixtape') => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20 h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="album">Album</SelectItem>
                        <SelectItem value="ep">EP</SelectItem>
                        <SelectItem value="mixtape">Mixtape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genre" className="text-gray-300 font-medium">Genre</Label>
                    <Input
                      id="genre"
                      value={formData.genre}
                      onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                      placeholder="Enter genre..."
                      className="bg-slate-800 border-slate-700 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="release_date" className="text-gray-300 font-medium">Release Date</Label>
                    <Input
                      id="release_date"
                      type="date"
                      value={formData.release_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300 font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell your fans about this track..."
                    className="bg-slate-800 border-slate-700 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20 min-h-[100px]"
                    rows={4}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-gray-300 font-medium">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      className="bg-slate-800 border-slate-700 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20 h-12"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button 
                      type="button" 
                      onClick={addTag} 
                      variant="outline" 
                      className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-purple-500 rounded-xl h-12 px-6"
                    >
                      Add
                    </Button>
                  </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
              />
              <Label htmlFor="public" className="text-gray-300">Public</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label htmlFor="featured" className="text-gray-300">Featured</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="allow_download"
                checked={formData.allow_download}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_download: checked }))}
              />
              <Label htmlFor="allow_download" className="text-gray-300">Allow Download</Label>
            </div>
          </div>

          {/* External Links & Commerce */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_track_url" className="text-gray-300">Full Track URL (Spotify, Apple, etc.)</Label>
              <Input
                id="full_track_url"
                value={formData.full_track_url}
                onChange={(e) => setFormData(prev => ({ ...prev, full_track_url: e.target.value }))}
                placeholder="https://..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_for_sale"
                  checked={formData.is_for_sale}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_for_sale: checked }))}
                />
                <Label htmlFor="is_for_sale" className="text-gray-300">Offer to buy full track</Label>
              </div>
              {formData.is_for_sale && (
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Buy URL"
                    value={formData.buy_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, buy_url: e.target.value }))}
                    className="col-span-2 bg-slate-800 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Price"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Share as Post */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="share-post"
                checked={shareAsPost}
                onCheckedChange={setShareAsPost}
              />
              <Label htmlFor="share-post" className="text-gray-300">Share as Post</Label>
            </div>
            {shareAsPost && (
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write a post about your new track..."
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rights Confirmation */}
      <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="rights_confirmed"
              checked={formData.rights_confirmed}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, rights_confirmed: checked === true }))
              }
              className="mt-0.5 border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
            <label htmlFor="rights_confirmed" className="text-xs leading-relaxed text-slate-300 cursor-pointer">
              <span className="flex items-center gap-1.5 text-sm font-medium text-white mb-1">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                Rights Confirmation
              </span>
              I confirm that I am the original creator of this content, or I have obtained all necessary
              rights and licenses to upload and distribute it on Tourify. I understand that uploading
              copyrighted material without authorization violates{' '}
              <a href="/terms" className="text-purple-400 hover:underline" target="_blank">
                Tourify&apos;s Terms of Service
              </a>{' '}
              and may result in account suspension.
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isUploading || !musicFile?.file || !formData.title.trim() || !formData.rights_confirmed}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isUploading ? 'Uploading...' : 'Upload Track'}
        </Button>
      </div>
    </div>
  </div>
</div>
</div>
  )
} 