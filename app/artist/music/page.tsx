"use client"

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MusicPlayer } from "@/components/music/music-player"
import { tafConverter } from '@/lib/utils/taf-converter'

interface MusicTrack {
  id: string
  title: string
  description?: string
  type: 'single' | 'album' | 'ep' | 'mixtape'
  genre?: string
  release_date?: string
  duration?: number
  file_url: string
  cover_art_url?: string
  lyrics?: string
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
  tags: string[]
  is_featured: boolean
  is_public: boolean
  stats: {
    plays: number
    likes: number
    comments: number
    shares: number
  }
  created_at: string
  updated_at: string
}

interface ArtistProfile {
  id: string
  user_id: string
  artist_name: string
  bio?: string
  avatar_url?: string
  cover_image_url?: string
  genre?: string
  location?: string
  website_url?: string
  social_links?: Record<string, string>
  verified: boolean
  created_at: string
  updated_at: string
}

export default function MusicPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null)
  const [deletingTrack, setDeletingTrack] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [shareAsPost, setShareAsPost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [newTag, setNewTag] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'single' as 'single' | 'album' | 'ep' | 'mixtape',
    genre: '',
    release_date: '',
    duration: 0,
    file_url: '',
    cover_art_url: '',
    lyrics: '',
    spotify_url: '',
    apple_music_url: '',
    soundcloud_url: '',
    youtube_url: '',
    tags: [] as string[],
    is_featured: false,
    is_public: true
  })

  useEffect(() => {
    if (user) {
      loadProfile()
      loadTracks()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadTracks = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('artist_music')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTracks(data || [])
    } catch (error) {
      console.error('Error loading tracks:', error)
      toast.error('Failed to load tracks')
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
      const safeFileName = fileToUpload.name.replace(/[^A-Za-z0-9._-]/g, '_')
      const musicFileName = `${user.id}/${Date.now()}-${safeFileName}`
      
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
        const safeCoverFileName = coverToUpload.name.replace(/[^A-Za-z0-9._-]/g, '_')
        const coverFileName = `${user.id}/${Date.now()}-cover-${safeCoverFileName}`
        
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

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.round(audio.duration))
      })
      audio.src = URL.createObjectURL(file)
    })
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

        // Convert to TAF format with error correction
        toast.info('Converting to TAF format with error correction...')
        const tafResult = await tafConverter.convertToTaf(uploadResult.fileUrl, user.id, {
          dataShards: 4,
          parityShards: 2,
          compressionLevel: 3,
          quality: 0.8
        })

        if (!tafResult.success) {
          toast.error(`TAF conversion failed: ${tafResult.error}`)
          // Continue with original file if TAF conversion fails
        } else {
          toast.success(`TAF conversion successful! Compression ratio: ${tafResult.metadata?.compressionRatio.toFixed(2)}x`)
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
          file_url: tafResult.success ? tafResult.tafUrl! : uploadResult.fileUrl,
          cover_art_url: uploadResult.coverUrl,
          lyrics: trackData.lyrics,
          spotify_url: trackData.spotify_url,
          apple_music_url: trackData.apple_music_url,
          soundcloud_url: trackData.soundcloud_url,
          youtube_url: trackData.youtube_url,
          tags: trackData.tags,
          is_featured: trackData.is_featured,
          is_public: trackData.is_public
          // Removed updated_at - let database handle it with default now()
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
        const uploadResult = await uploadFiles(musicFile, coverFile || undefined)
        if (uploadResult.fileUrl) {
          // Convert to TAF format with error correction
          toast.info('Converting to TAF format with error correction...')
          const tafResult = await tafConverter.convertToTaf(uploadResult.fileUrl, user.id, {
            dataShards: 4,
            parityShards: 2,
            compressionLevel: 3,
            quality: 0.8
          })

          if (tafResult.success) {
            fileUrl = tafResult.tafUrl!
            toast.success(`TAF conversion successful! Compression ratio: ${tafResult.metadata?.compressionRatio.toFixed(2)}x`)
          } else {
            fileUrl = uploadResult.fileUrl
            toast.error(`TAF conversion failed: ${tafResult.error}`)
          }
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
        is_public: formData.is_public
        // Removed updated_at - let database handle it with default now()
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

  const handleDeleteTrack = async (trackId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('artist_music')
        .delete()
        .eq('id', trackId)
        .eq('user_id', user.id)

      if (error) throw error
      
      toast.success('Track deleted successfully!')
      await loadTracks()
    } catch (error) {
      console.error('Error deleting track:', error)
      toast.error('Failed to delete track')
    } finally {
      setDeletingTrack(null)
    }
  }

  const handlePlayPause = (trackId: string) => {
    setCurrentlyPlaying(currentlyPlaying === trackId ? null : trackId)
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalStats = () => {
    return tracks.reduce((acc, track) => ({
      plays: acc.plays + (track.stats?.plays || 0),
      likes: acc.likes + (track.stats?.likes || 0),
      comments: acc.comments + (track.stats?.comments || 0),
      shares: acc.shares + (track.stats?.shares || 0)
    }), { plays: 0, likes: 0, comments: 0, shares: 0 })
  }

  const getFilteredTracks = () => {
    let filtered = tracks

    // Filter by tab
    switch (activeTab) {
      case 'featured':
        filtered = filtered.filter(track => track.is_featured)
        break
      case 'recent':
        filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        filtered = filtered.sort((a, b) => (b.stats?.plays || 0) - (a.stats?.plays || 0))
        break
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filtered
  }

  const createMusicPost = async (trackId: string, title: string, coverUrl?: string) => {
    if (!user || !postContent.trim()) return

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postContent,
          type: 'music',
          metadata: {
            track_id: trackId,
            track_title: title,
            cover_url: coverUrl
          }
        })

      if (error) throw error
      toast.success('Post created successfully!')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  const totalStats = getTotalStats()
  const filteredTracks = getFilteredTracks()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-6">Please log in to access your music library.</p>
            <Button onClick={() => router.push('/login')} className="bg-purple-600 hover:bg-purple-700">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Music Library</h1>
            <p className="text-gray-400 text-lg">
              Upload, manage, and promote your music to reach new audiences
            </p>
          </div>
          
          <Button 
            onClick={() => setShowUploader(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Upload className="h-5 w-5" />
            Upload Track
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Plays</p>
                  <p className="text-2xl font-bold text-white">{totalStats.plays.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Likes</p>
                  <p className="text-2xl font-bold text-white">{totalStats.likes.toLocaleString()}</p>
                </div>
                <Heart className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Comments</p>
                  <p className="text-2xl font-bold text-white">{totalStats.comments.toLocaleString()}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Tracks</p>
                  <p className="text-2xl font-bold text-white">{tracks.length}</p>
                </div>
                <Music2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search tracks, genres, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-xl"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="all" className="text-white data-[state=active]:bg-purple-600">All</TabsTrigger>
              <TabsTrigger value="featured" className="text-white data-[state=active]:bg-purple-600">Featured</TabsTrigger>
              <TabsTrigger value="recent" className="text-white data-[state=active]:bg-purple-600">Recent</TabsTrigger>
              <TabsTrigger value="popular" className="text-white data-[state=active]:bg-purple-600">Popular</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tracks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl animate-pulse">
                <CardContent className="p-6">
                  <div className="w-full h-48 bg-gray-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Music2 className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">No tracks found</h3>
              <p className="text-gray-400 text-lg mb-6">
                {searchTerm ? 'Try adjusting your search terms.' : 'Start by uploading your first track to build your music library.'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowUploader(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Upload Your First Track
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTracks.map((track) => (
              <Card key={track.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/15 transition-all duration-300 group">
                <CardContent className="p-6">
                  {/* Cover Art */}
                  <div className="relative mb-4">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      {track.cover_art_url ? (
                        <Image
                          src={track.cover_art_url}
                          alt={track.title}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="h-16 w-16 text-purple-400/50" />
                        </div>
                      )}
                    </div>
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        onClick={() => handlePlayPause(track.id)}
                        className="bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30 rounded-full w-16 h-16"
                      >
                        {currentlyPlaying === track.id ? (
                          <Pause className="h-6 w-6 text-white" />
                        ) : (
                          <Play className="h-6 w-6 text-white ml-1" />
                        )}
                      </Button>
                    </div>

                    {/* Featured Badge */}
                    {track.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                        Featured
                      </Badge>
                    )}

                    {/* Privacy Badge */}
                    <Badge className={`absolute top-2 right-2 ${track.is_public ? 'bg-green-600/20 text-green-400' : 'bg-orange-600/20 text-orange-400'}`}>
                      {track.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                      {track.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </div>

                  {/* Track Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-white text-lg line-clamp-1">{track.title}</h3>
                    <p className="text-gray-400 text-sm">{track.type.charAt(0).toUpperCase() + track.type.slice(1)}</p>
                    {track.genre && (
                      <p className="text-gray-400 text-sm">{track.genre}</p>
                    )}
                    {track.duration && (
                      <p className="text-gray-400 text-sm">{formatDuration(track.duration)}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {track.stats?.plays || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {track.stats?.likes || 0}
                      </span>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem onClick={() => setEditingTrack(track)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingTrack(track.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Music Player */}
        {currentlyPlaying && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/20 p-4 z-50">
            <MusicPlayer
              track={filteredTracks.find(t => t.id === currentlyPlaying)!}
            />
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
                <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
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
                <Card className="bg-slate-900/50 border-slate-700/50 rounded-2xl">
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
        <Dialog open={!!deletingTrack} onOpenChange={() => setDeletingTrack(null)}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Track</DialogTitle>
            </DialogHeader>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this track? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingTrack(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deletingTrack && handleDeleteTrack(deletingTrack)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 