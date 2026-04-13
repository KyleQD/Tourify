"use client"

import { supabase } from '@/lib/supabase/client'
import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { 
  Upload,
  Music2,
  Play,
  Pause,
  Edit,
  Trash2,
  Download,
  Share2,
  MoreHorizontal,
  TrendingUp,
  Clock,
  Users,
  Plus,
  Volume2,
  Heart,
  MessageCircle,
  ExternalLink,
  Globe,
  Lock,
  Users2
} from "lucide-react"
import { EnhancedMusicUploader } from "@/components/music/enhanced-music-uploader"
import Image from "next/image"
import { extractApiError } from "@/lib/api/extract-error"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MusicTrack {
  id?: string
  title: string
  artist: string
  album?: string
  genre: string
  duration?: number
  file_url: string
  cover_art_url?: string
  description?: string
  lyrics?: string
  release_date?: string
  is_featured: boolean
  is_public: boolean
  play_count: number
  download_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  tags: string[]
  type: 'single' | 'album' | 'ep' | 'mixtape'
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
  created_at?: string
  updated_at?: string
}

export default function MusicPage() {
  const { user, profile } = useArtist()
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null)
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null)
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  
  // Uploader form state
  const [formData, setFormData] = useState<MusicTrack>({
    title: '',
    artist: profile?.artist_name || '',
    album: '',
    genre: '',
    description: '',
    lyrics: '',
    release_date: '',
    is_featured: false,
    is_public: true,
    play_count: 0,
    download_count: 0,
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
    tags: [],
    type: 'single',
    file_url: ''
  })
  
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [shareAsPost, setShareAsPost] = useState(false)
  const [postContent, setPostContent] = useState('')

  useEffect(() => {
    if (user) {
      loadTracks()
    }
  }, [user])

  useEffect(() => {
    if (editingTrack) {
      setFormData({
        ...editingTrack,
        artist: editingTrack.artist || profile?.artist_name || ''
      })
    } else {
      setFormData({
        title: '',
        artist: profile?.artist_name || '',
        album: '',
        genre: '',
        description: '',
        lyrics: '',
        release_date: '',
        is_featured: false,
        is_public: true,
        play_count: 0,
        download_count: 0,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        tags: [],
        type: 'single',
        file_url: ''
      })
      setMusicFile(null)
      setCoverFile(null)
      setShareAsPost(false)
      setPostContent('')
    }
  }, [editingTrack, profile])

  const loadTracks = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // Try to load from artist_music table first, fallback to artist_works
      let { data, error } = await supabase
        .from('artist_music')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback to artist_works table
        const { data: worksData, error: worksError } = await supabase
          .from('artist_works')
          .select('*')
          .eq('user_id', user.id)
          .eq('media_type', 'audio')
          .order('created_at', { ascending: false })

        if (worksError) throw worksError
        
        // Transform artist_works data to match MusicTrack interface
        const transformedTracks = (worksData || []).map(work => ({
          id: work.id,
          title: work.title,
          artist: profile?.artist_name || 'Unknown Artist',
          album: '',
          genre: work.tags?.[0] || 'Unknown',
          file_url: work.media_url,
          cover_art_url: work.thumbnail_url,
          description: work.description,
          lyrics: '',
          release_date: '',
          is_featured: work.is_featured,
          is_public: true,
          play_count: 0,
          download_count: 0,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          tags: work.tags || [],
          duration: work.duration,
          type: 'single' as const,
          spotify_url: undefined,
          apple_music_url: undefined,
          soundcloud_url: undefined,
          youtube_url: undefined,
          created_at: work.created_at,
          updated_at: work.updated_at
        }))
        
        setTracks(transformedTracks)
      } else {
        // Use artist_music data directly
        setTracks(data || [])
      }
    } catch (error) {
      console.error('Error loading tracks:', error)
      toast.error('Failed to load music tracks')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFiles = async (customMusicFile?: File, customCoverFile?: File) => {
    const fileToUpload = customMusicFile || musicFile
    const coverToUpload = customCoverFile || coverFile
    
    if (!fileToUpload || !user) return { fileUrl: '', coverUrl: '' }

    try {
      setUploadProgress(20)
      
      // Upload music file
      const musicFileExt = fileToUpload.name.split('.').pop()
      const musicFileName = `${user.id}/${Date.now()}-${fileToUpload.name}`
      
      const { error: musicUploadError } = await supabase.storage
        .from('artist-music')
        .upload(musicFileName, fileToUpload)

      if (musicUploadError) throw musicUploadError

      const { data: { publicUrl: musicUrl } } = supabase.storage
        .from('artist-music')
        .getPublicUrl(musicFileName)

      setUploadProgress(60)

      // Upload cover art if provided
      let coverUrl = ''
      if (coverToUpload) {
        const coverFileExt = coverToUpload.name.split('.').pop()
        const coverFileName = `${user.id}/${Date.now()}-cover.${coverFileExt}`
        
        const { error: coverUploadError } = await supabase.storage
          .from('artist-photos')
          .upload(coverFileName, coverToUpload)

        if (coverUploadError) throw coverUploadError

        const { data: { publicUrl } } = supabase.storage
          .from('artist-photos')
          .getPublicUrl(coverFileName)

        coverUrl = publicUrl
      }

      setUploadProgress(100)
      return { fileUrl: musicUrl, coverUrl }
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Failed to upload files')
      return { fileUrl: '', coverUrl: '' }
    }
  }

  const createMusicPost = async (trackId: string, trackTitle: string, coverUrl?: string) => {
    if (!user) return

    try {
      const content = shareAsPost ? postContent : `Just released: "${trackTitle}" 🎵`
      
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content,
          type: 'music',
          media_urls: coverUrl ? [coverUrl] : [],
          hashtags: formData.tags,
          metadata: {
            music_track_id: trackId,
            track_title: trackTitle,
            artist_name: formData.artist,
            genre: formData.genre,
            type: formData.type
          }
        })

      if (error) throw error
      
      toast.success('Music shared as post!')
    } catch (error) {
      console.error('Error creating music post:', error)
      toast.error('Failed to share as post')
    }
  }

  const handleSaveTrack = async (trackData?: any) => {
    if (!user) {
      toast.error('Please log in to upload music')
      return
    }

    // Handle data from enhanced uploader
    if (trackData && trackData.musicFile) {
      try {
        setIsUploading(true)
        setUploadProgress(0)
        
        // Upload files
        const uploadResult = await uploadFiles(trackData.musicFile, trackData.coverFile)
        if (!uploadResult.fileUrl) {
          toast.error('Failed to upload music file')
          return
        }

        const finalTrackData = {
          user_id: user.id,
          artist_profile_id: profile?.id,
          title: trackData.title,
          description: trackData.description,
          type: trackData.type,
          genre: trackData.genre,
          release_date: trackData.release_date || new Date().toISOString().split('T')[0],
          duration: await getAudioDuration(trackData.musicFile),
          file_url: uploadResult.fileUrl,
          cover_art_url: uploadResult.coverUrl,
          lyrics: trackData.lyrics,
          spotify_url: trackData.spotify_url,
          apple_music_url: trackData.apple_music_url,
          soundcloud_url: trackData.soundcloud_url,
          youtube_url: trackData.youtube_url,
          tags: trackData.tags,
          is_featured: trackData.is_featured,
          is_public: trackData.is_public,
          updated_at: new Date().toISOString()
        }

        // Create new track
        const { data, error } = await supabase
          .from('artist_music')
          .insert(finalTrackData)
          .select()
          .single()

        if (error) throw error
        
        toast.success('Track uploaded successfully!')

        // Share as post if requested
        if (trackData.shareAsPost) {
          await createMusicPost(data.id, trackData.title, uploadResult.coverUrl)
        }
        
        setShowUploader(false)
        await loadTracks()
      } catch (error) {
        console.error('Error saving track:', error)
        toast.error('Failed to save track')
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
      return
    }

    // Handle editing existing track
    if (!formData.title.trim()) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      
      let fileUrl = formData.file_url
      let coverUrl = formData.cover_art_url

      // Upload files if files have changed
      if (musicFile) {
        const uploadResult = await uploadFiles()
        if (uploadResult.fileUrl) {
          fileUrl = uploadResult.fileUrl
        }
        if (uploadResult.coverUrl) {
          coverUrl = uploadResult.coverUrl
        }
      }

      const trackData = {
        user_id: user.id,
        artist_profile_id: profile?.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        genre: formData.genre,
        release_date: formData.release_date || new Date().toISOString().split('T')[0],
        duration: musicFile ? await getAudioDuration(musicFile) : formData.duration,
        file_url: fileUrl,
        cover_art_url: coverUrl,
        lyrics: formData.lyrics,
        spotify_url: formData.spotify_url,
        apple_music_url: formData.apple_music_url,
        soundcloud_url: formData.soundcloud_url,
        youtube_url: formData.youtube_url,
        tags: formData.tags,
        is_featured: formData.is_featured,
        is_public: formData.is_public,
        updated_at: new Date().toISOString()
      }

      // Update existing track
      const { error } = await supabase
        .from('artist_music')
        .update(trackData)
        .eq('id', editingTrack!.id)
        .eq('user_id', user.id)

      if (error) throw error
      
      toast.success('Track updated successfully!')
      
      setShowUploader(false)
      setEditingTrack(null)
      await loadTracks()
    } catch (error) {
      console.error('Error saving track:', error)
      toast.error('Failed to save track')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.src = URL.createObjectURL(file)
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration))
        URL.revokeObjectURL(audio.src)
      }
      audio.onerror = () => resolve(0)
    })
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('artist_music')
        .delete()
        .eq('id', trackId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setTracks(prev => prev.filter(track => track.id !== trackId))
      toast.success('Track deleted successfully')
    } catch (error) {
      console.error('Error deleting track:', error)
      toast.error('Failed to delete track')
    } finally {
      setDeleteTrackId(null)
    }
  }

  const handleListTrackForSale = async (track: MusicTrack) => {
    if (!track.id) return
    try {
      const response = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: track.title,
          description: track.description || `Purchase access to ${track.title}`,
          category: 'music',
          productType: 'digital_asset',
          status: 'draft',
          basePrice: 1.99,
          trackId: track.id,
          rightsConfirmed: true,
          licenseType: 'personal_use',
          metadata: {
            genre: track.genre,
            duration: track.duration,
            artistName: track.artist,
          },
          variants: [{ title: 'Default', price: 1.99, isDefault: true }],
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(extractApiError(body, 'Failed to create listing'))
      }

      toast.success('Track added to marketplace drafts')
    } catch (error) {
      console.error('Error listing track for sale:', error)
      toast.error('Failed to list track for sale')
    }
  }

  const handlePlayPause = (track: MusicTrack) => {
    if (currentPlaying === track.id) {
      // Pause current track
      audioElement?.pause()
      setCurrentPlaying(null)
    } else {
      // Play new track
      if (audioElement) {
        audioElement.pause()
      }
      const audio = new Audio(track.file_url)
      audio.play()
      setAudioElement(audio)
      setCurrentPlaying(track.id!)
      
      audio.onended = () => {
        setCurrentPlaying(null)
        setAudioElement(null)
      }
    }
  }

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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalStats = () => {
    return tracks.reduce((acc, track) => ({
      totalTracks: acc.totalTracks + 1,
      totalPlays: acc.totalPlays + track.play_count,
      totalLikes: acc.totalLikes + track.likes_count,
      totalDuration: acc.totalDuration + (track.duration || 0),
      featuredTracks: acc.featuredTracks + (track.is_featured ? 1 : 0)
    }), { totalTracks: 0, totalPlays: 0, totalLikes: 0, totalDuration: 0, featuredTracks: 0 })
  }

  const getFilteredTracks = () => {
    switch (activeTab) {
      case 'featured':
        return tracks.filter(track => track.is_featured)
      case 'public':
        return tracks.filter(track => track.is_public)
      case 'private':
        return tracks.filter(track => !track.is_public)
      default:
        return tracks
    }
  }

  const stats = getTotalStats()
  const filteredTracks = getFilteredTracks()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Music2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Music Library</h1>
            <p className="text-gray-400">Upload and manage your music tracks</p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setEditingTrack(null)
            setShowUploader(true)
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Track
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <Music2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Plays</p>
                <p className="text-2xl font-bold text-white">{stats.totalPlays.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Likes</p>
                <p className="text-2xl font-bold text-white">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Duration</p>
                <p className="text-2xl font-bold text-white">{Math.round(stats.totalDuration / 60)}m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Featured</p>
                <p className="text-2xl font-bold text-white">{stats.featuredTracks}</p>
              </div>
              <Volume2 className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800">
          <TabsTrigger value="all" className="text-gray-300">All Tracks</TabsTrigger>
          <TabsTrigger value="featured" className="text-gray-300">Featured</TabsTrigger>
          <TabsTrigger value="public" className="text-gray-300">Public</TabsTrigger>
          <TabsTrigger value="private" className="text-gray-300">Private</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tracks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-slate-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTracks.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Music2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No tracks yet</h3>
            <p className="text-gray-400 mb-6">
              Start building your music library by uploading your first track.
            </p>
            <Button 
              onClick={() => {
                setEditingTrack(null)
                setShowUploader(true)
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Track
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTracks.map((track) => (
            <Card key={track.id} className="bg-slate-900/50 border-slate-700/50 group hover:border-purple-500/50 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Cover Art */}
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                    {track.cover_art_url ? (
                      <Image
                        src={track.cover_art_url}
                        alt={track.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Music2 className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {track.title}
                          </h3>
                          {track.is_featured && (
                            <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 text-xs">
                              Featured
                            </Badge>
                          )}
                          {!track.is_public && (
                            <Badge variant="outline" className="text-xs border-gray-500 text-gray-400">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {track.artist} • {track.genre} • {formatDuration(track.duration)}
                        </p>
                        {track.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {track.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs border-purple-500/30 text-purple-300"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            {track.play_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {track.likes_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {track.comments_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {track.shares_count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayPause(track)}
                          className="text-gray-400 hover:text-white"
                        >
                          {currentPlaying === track.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingTrack(track)
                                setShowUploader(true)
                              }}
                              className="text-gray-300 hover:text-white"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:text-white">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 hover:text-white">
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleListTrackForSale(track)}
                              className="text-gray-300 hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              List for Sale
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem 
                              onClick={() => setDeleteTrackId(track.id!)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload/Edit Dialog */}
      <Dialog open={showUploader} onOpenChange={setShowUploader}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTrack ? 'Edit Track' : 'Upload New Track'}
            </DialogTitle>
          </DialogHeader>
          
          {editingTrack ? (
            // Show original form for editing
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cover-file" className="text-gray-300">Cover Art</Label>
                    <Input
                      id="cover-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <Label className="text-gray-300">Upload Progress</Label>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Track Details */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Track Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-gray-300">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Track title..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-gray-300">Type</Label>
                      <Select value={formData.type} onValueChange={(value: 'single' | 'album' | 'ep' | 'mixtape') => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="album">Album</SelectItem>
                          <SelectItem value="ep">EP</SelectItem>
                          <SelectItem value="mixtape">Mixtape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="genre" className="text-gray-300">Genre</Label>
                      <Input
                        id="genre"
                        value={formData.genre}
                        onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                        placeholder="Genre..."
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Track description..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
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
                        id="public"
                        checked={formData.is_public}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                      />
                      <Label htmlFor="public" className="text-gray-300">
                        {formData.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {formData.is_public ? 'Public' : 'Private'}
                      </Label>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag..."
                        className="bg-slate-800 border-slate-700 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button type="button" onClick={addTag} variant="outline" size="sm">
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
                </CardContent>
              </Card>
            </div>
          ) : (
            // Show enhanced uploader for new tracks
            <EnhancedMusicUploader
              onUploadComplete={handleSaveTrack}
              onCancel={() => setShowUploader(false)}
              isUploading={isUploading}
            />
          )}

          {editingTrack && (
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowUploader(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleSaveTrack} disabled={isUploading} className="bg-purple-600 hover:bg-purple-700">
                {isUploading ? 'Uploading...' : 'Update'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTrackId} onOpenChange={() => setDeleteTrackId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Track</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this track? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTrackId && handleDeleteTrack(deleteTrackId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 