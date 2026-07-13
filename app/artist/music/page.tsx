"use client"

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useArtist } from '@/contexts/artist-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
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
  Users2,
  ShoppingBag,
  RefreshCw,
  Loader2,
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
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import {
  fetchJsonWithTimeout,
  getAudioDuration,
  parseMusicApiError,
  parsePaidTrackPrice,
} from "@/lib/music/upload-helpers"

interface MusicTrack {
  id: string
  title: string
  description?: string
  type: 'single' | 'album' | 'ep' | 'mixtape'
  genre?: string
  release_date?: string
  duration?: number
  file_url: string
  preview_file_url?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
	  preview_storage_bucket?: string | null
	  preview_storage_path?: string | null
  preview_status?: 'not_required' | 'pending' | 'ready' | 'failed'
  preview_error?: string | null
  preview_generated_at?: string | null
  cover_art_url?: string
  lyrics?: string
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  youtube_url?: string
  tags: string[]
  is_featured: boolean
  is_public: boolean
  access_mode?: 'free' | 'paid'
  preview_mode?: 'full' | 'clip'
  preview_duration_seconds?: number
  allow_library_add?: boolean
  allow_profile_feature?: boolean
  allow_downloads?: boolean
  rights_confirmed?: boolean
  rights_confirmed_at?: string | null
  listing_sync_status?: string | null
  listing_sync_error?: string | null
  metadata?: Record<string, unknown>
  stats: {
    plays: number
    likes: number
    comments: number
    shares: number
  }
  created_at: string
  updated_at: string
}

interface MarketplaceListing {
  id: string
  title: string
  status: string
  category: string
  product_type: string
  base_price: number | null
  currency: string
  music_track_id?: string | null
}

export default function MusicPage() {
  const { user, profile, isLoading: isArtistLoading } = useArtist()
  const { currentAccount, isAccountsReady } = useMultiAccount()
  const router = useRouter()
  const jukebox = useJukeboxOptional()
  
  const [tracks, setTracks] = useState<MusicTrack[]>([])
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
  const [isLoading, setIsLoading] = useState(true)
  const [musicListings, setMusicListings] = useState<MarketplaceListing[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'single' as 'single' | 'album' | 'ep' | 'mixtape',
    genre: '',
    release_date: '',
    duration: 0,
    file_url: '',
    storage_bucket: '',
    storage_path: '',
    preview_storage_bucket: '',
    preview_storage_path: '',
    cover_art_url: '',
    lyrics: '',
    spotify_url: '',
    apple_music_url: '',
    soundcloud_url: '',
    youtube_url: '',
    tags: [] as string[],
    is_featured: false,
    is_public: true,
    access_mode: 'free' as 'free' | 'paid',
    allow_library_add: true,
    allow_profile_feature: true,
    allow_downloads: false,
    rights_confirmed: false,
  })

  function resetFormData() {
    setFormData({
      title: '',
      description: '',
      type: 'single',
      genre: '',
      release_date: '',
      duration: 0,
      file_url: '',
      storage_bucket: '',
      storage_path: '',
      preview_storage_bucket: '',
      preview_storage_path: '',
      cover_art_url: '',
      lyrics: '',
      spotify_url: '',
      apple_music_url: '',
      soundcloud_url: '',
      youtube_url: '',
      tags: [],
      is_featured: false,
      is_public: true,
      access_mode: 'free',
      allow_library_add: true,
      allow_profile_feature: true,
      allow_downloads: false,
      rights_confirmed: false,
    })
    setMusicFile(null)
    setCoverFile(null)
    setShareAsPost(false)
    setPostContent('')
  }

  function hydrateFormFromTrack(track: MusicTrack) {
    setFormData({
      title: track.title || '',
      description: track.description || '',
      type: track.type || 'single',
      genre: track.genre || '',
      release_date: track.release_date || '',
      duration: track.duration || 0,
      file_url: track.file_url || '',
      storage_bucket: track.storage_bucket || '',
      storage_path: track.storage_path || '',
      preview_storage_bucket: track.preview_storage_bucket || '',
      preview_storage_path: track.preview_storage_path || '',
      cover_art_url: track.cover_art_url || '',
      lyrics: track.lyrics || '',
      spotify_url: track.spotify_url || '',
      apple_music_url: track.apple_music_url || '',
      soundcloud_url: track.soundcloud_url || '',
      youtube_url: track.youtube_url || '',
      tags: track.tags || [],
      is_featured: track.is_featured || false,
      is_public: track.is_public ?? true,
      access_mode: track.access_mode || 'free',
      allow_library_add: track.allow_library_add ?? true,
      allow_profile_feature: track.allow_profile_feature ?? true,
      allow_downloads: track.allow_downloads || false,
      rights_confirmed: track.rights_confirmed === true,
    })
  }

  const activeAccountId = currentAccount?.profile_id ?? null
  const hasActiveAccount = Boolean(currentAccount)

  useEffect(() => {
    if (isArtistLoading || !isAccountsReady) return
    // Server-seeded account means session is valid; wait for artist user to hydrate.
    if (hasActiveAccount && !user) return

    if (!user) {
      setIsLoading(false)
      return
    }

    loadTracks()
    loadMusicListings()
    // activeAccountId: reload when the artist switches accounts
  }, [user, isArtistLoading, isAccountsReady, hasActiveAccount, activeAccountId])

  useEffect(() => {
    if (!isAccountsReady || isArtistLoading) return
    if (hasActiveAccount && !user) return
    if (user) return

    router.replace('/login?redirectTo=%2Fartist%2Fmusic')
  }, [user, isArtistLoading, isAccountsReady, hasActiveAccount, router])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("upload") !== "1") return
    setShowUploader(true)
    router.replace("/artist/music", { scroll: false })
  }, [router])

  const loadTracks = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/artist/music?limit=300', {
        credentials: 'include',
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || body?.error || 'Failed to load tracks')
      setTracks(body.data || [])
    } catch (error) {
      console.error('Error loading tracks:', error)
      toast.error('Failed to load tracks')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMusicListings = async () => {
    try {
      const response = await fetch('/api/marketplace/listings?includeDrafts=true&category=music', {
        credentials: 'include',
        cache: 'no-store',
      })
      const body = await response.json()
      setMusicListings(Array.isArray(body.data) ? body.data : [])
    } catch (error) {
      console.error('Error loading music listings:', error)
      setMusicListings([])
    }
  }

  const createSignedUpload = async (file: File, kind: 'full' | 'preview' | 'cover') => {
    const { response, body } = await fetchJsonWithTimeout('/api/artist/music/upload-url', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        kind,
      }),
    })
    if (!response.ok) throw new Error(parseMusicApiError(body, 'Unable to prepare upload'))
    return body.data as { bucket: string; path: string; token: string; signedUrl: string }
  }

  const uploadWithSignedUrl = async (file: File, kind: 'full' | 'preview' | 'cover') => {
    const prepared = await createSignedUpload(file, kind)
    const { error } = await supabase.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, {
        contentType: file.type,
      })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from(prepared.bucket)
      .getPublicUrl(prepared.path)
    return { ...prepared, publicUrl }
  }

  const cleanupUploadedPaths = async (uploads: Array<{ bucket?: string; path?: string } | null | undefined>) => {
    for (const upload of uploads) {
      if (!upload?.bucket || !upload?.path) continue
      try {
        await supabase.storage.from(upload.bucket).remove([upload.path])
      } catch (error) {
        console.warn('Failed to clean up uploaded file', upload.path, error)
      }
    }
  }

  const uploadFiles = async (customMusicFile?: File, customCoverFile?: File) => {
    const fileToUpload = customMusicFile || musicFile
    const coverToUpload = customCoverFile || coverFile
    
    if (!fileToUpload || !user) return { fileUrl: '', coverUrl: '', storageBucket: '', storagePath: '' }

    try {
      setUploadProgress(20)

      const musicUpload = await uploadWithSignedUrl(fileToUpload, 'full')

      setUploadProgress(60)

      let coverUrl = ''
      let coverUpload: Awaited<ReturnType<typeof uploadWithSignedUrl>> | null = null
      if (coverToUpload) {
        coverUpload = await uploadWithSignedUrl(coverToUpload, 'cover')
        coverUrl = coverUpload.publicUrl
      }

      setUploadProgress(80)
      return {
        fileUrl: musicUpload.publicUrl,
        coverUrl,
        storageBucket: musicUpload.bucket,
        storagePath: musicUpload.path,
        musicUpload,
        coverUpload,
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload files')
      return { fileUrl: '', coverUrl: '' }
    }
  }

  const uploadPreviewFile = async (file: File) => {
    if (!user) return null
    return uploadWithSignedUrl(file, 'preview')
  }

  const queuePreviewJob = async (musicId: string) => {
    const { response, body } = await fetchJsonWithTimeout('/api/artist/music/preview-jobs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicId }),
    })
    if (!response.ok) throw new Error(parseMusicApiError(body, 'Unable to queue preview'))
    return body.data
  }

  const createMusicPost = async ({
    trackId,
    title,
    content,
    coverUrl,
  }: {
    trackId: string
    title: string
    content?: string
    coverUrl?: string
  }) => {
    const { response, body } = await fetchJsonWithTimeout('/api/music/share', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musicId: trackId,
        createPost: true,
        content: content?.trim() || `New track: "${title}"`,
      }),
    })
    if (!response.ok) throw new Error(parseMusicApiError(body, 'Failed to create share post'))
    toast.success('Shared to your feed')
    return body
  }

  const handleDownloadTrack = async (track: MusicTrack) => {
    try {
      const { response, body } = await fetchJsonWithTimeout(
        `/api/music/download?trackId=${encodeURIComponent(track.id)}`,
        { method: 'GET', credentials: 'include' }
      )
      if (!response.ok) throw new Error(parseMusicApiError(body, 'Download unavailable'))
      const url = body?.url || body?.data?.url || body?.downloadUrl
      if (!url) throw new Error('Download URL missing')
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download track')
    }
  }

  const handleShareTrack = async (track: MusicTrack) => {
    try {
      await createMusicPost({
        trackId: track.id,
        title: track.title,
        content: `Check out "${track.title}"`,
        coverUrl: track.cover_art_url,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share track')
    }
  }

  const publishTrackWhenReady = async (track: MusicTrack) => {
    if (track.preview_mode === 'clip' && track.preview_status !== 'ready') {
      toast.error('Preview sample must be ready before publishing')
      return
    }
    try {
      const { response, body } = await fetchJsonWithTimeout('/api/artist/music', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: track.id,
          is_public: true,
          rights_confirmed: true,
          rights_confirmed_at: track.rights_confirmed_at || new Date().toISOString(),
        }),
      })
      if (!response.ok) throw new Error(parseMusicApiError(body, 'Failed to publish track'))
      toast.success('Track published')
      await loadTracks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish track')
    }
  }

  const handleSaveTrack = async (trackData?: any) => {
    if (!user) {
      toast.error('Please log in to upload music')
      return
    }

    if (trackData && trackData.musicFile) {
      let uploadedArtifacts: Array<{ bucket?: string; path?: string } | null | undefined> = []
      try {
        setIsUploading(true)
        setUploadProgress(0)

        if (trackData.access_mode === 'paid') {
          const price = parsePaidTrackPrice(trackData.price ?? trackData.metadata?.price)
          if (!price) {
            toast.error('Enter a price greater than 0 to offer this track for sale')
            return
          }
          trackData.price = price
          trackData.metadata = { ...(trackData.metadata || {}), price }
        }

        const uploadResult = await uploadFiles(trackData.musicFile, trackData.coverFile)
        if (!uploadResult.fileUrl || !uploadResult.storagePath) {
          toast.error('Failed to upload music file')
          return
        }
        uploadedArtifacts = [uploadResult.musicUpload, uploadResult.coverUpload]

        const needsGeneratedPreview = trackData.preview_mode === 'clip' && !trackData.previewFile
        const previewUpload = trackData.preview_mode === 'clip' && trackData.previewFile
          ? await uploadPreviewFile(trackData.previewFile)
          : null
        if (previewUpload) uploadedArtifacts.push(previewUpload)

        const previewStatus =
          trackData.preview_mode !== 'clip'
            ? 'not_required'
            : previewUpload
              ? 'ready'
              : 'pending'

        setUploadProgress(90)
        const duration = await getAudioDuration(trackData.musicFile)

        const finalTrackData = {
          title: trackData.title,
          description: trackData.description,
          type: trackData.type,
          genre: trackData.genre,
          release_date: trackData.release_date || new Date().toISOString().split('T')[0],
          duration,
          file_url: uploadResult.fileUrl,
          storage_bucket: uploadResult.storageBucket || 'artist-music',
          storage_path: uploadResult.storagePath || null,
          preview_file_url:
            trackData.preview_mode === 'clip'
              ? previewUpload?.publicUrl || null
              : uploadResult.fileUrl,
          preview_storage_bucket:
            trackData.preview_mode === 'clip'
              ? previewUpload?.bucket || null
              : uploadResult.storageBucket || 'artist-music',
          preview_storage_path:
            trackData.preview_mode === 'clip'
              ? previewUpload?.path || null
              : uploadResult.storagePath || null,
          preview_status: previewStatus,
          preview_generated_at: previewStatus === 'ready' ? new Date().toISOString() : null,
          cover_art_url: uploadResult.coverUrl,
          lyrics: trackData.lyrics,
          spotify_url: trackData.spotify_url,
          apple_music_url: trackData.apple_music_url,
          soundcloud_url: trackData.soundcloud_url,
          youtube_url: trackData.youtube_url,
          tags: trackData.tags,
          is_featured: trackData.is_featured,
          is_public: needsGeneratedPreview ? false : trackData.is_public,
          access_mode: trackData.access_mode || 'free',
          preview_mode: trackData.preview_mode || 'full',
          preview_duration_seconds: trackData.preview_duration_seconds || 15,
          allow_library_add: trackData.allow_library_add ?? true,
          allow_profile_feature: trackData.allow_profile_feature ?? true,
          allow_downloads: trackData.allow_downloads || false,
          rights_confirmed: trackData.rights_confirmed === true,
          rights_confirmed_at: trackData.rights_confirmed_at || new Date().toISOString(),
          metadata: trackData.metadata || {},
          price: trackData.price || trackData.metadata?.price,
          currency: trackData.currency || trackData.metadata?.currency || 'USD',
        }

        const { response: createResponse, body: createBody } = await fetchJsonWithTimeout('/api/artist/music', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalTrackData),
        })
        if (!createResponse.ok) {
          await cleanupUploadedPaths(uploadedArtifacts)
          throw new Error(parseMusicApiError(createBody, 'Failed to save track'))
        }
        const data = createBody.data
        setUploadProgress(100)

        toast.success(
          needsGeneratedPreview
            ? 'Track saved as a draft. Preview generation is queued — publish when the sample is ready.'
            : 'Track uploaded successfully!'
        )

        if (trackData.shareAsPost && !needsGeneratedPreview) {
          try {
            await createMusicPost({
              trackId: data.id,
              title: trackData.title,
              content: trackData.postContent,
              coverUrl: uploadResult.coverUrl,
            })
          } catch (shareError) {
            toast.error(shareError instanceof Error ? shareError.message : 'Track saved, but sharing failed')
          }
        } else if (trackData.shareAsPost && needsGeneratedPreview) {
          toast.message('Share skipped until the track is public with a ready sample')
        }

        setShowUploader(false)
        resetFormData()
        await Promise.all([loadTracks(), loadMusicListings()])
      } catch (error) {
        console.error('Error saving track:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to save track')
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
      return
    }

    if (!formData.title.trim()) {
      toast.error('Please fill in required fields')
      return
    }

    if (formData.is_public && !formData.rights_confirmed && !editingTrack?.rights_confirmed) {
      toast.error('Confirm rights ownership before publishing this track')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      
      let fileUrl = formData.file_url
      let storageBucket = formData.storage_bucket || 'artist-music'
      let storagePath = formData.storage_path || null
      let coverUrl = formData.cover_art_url

      if (musicFile) {
        const uploadResult = await uploadFiles(musicFile, coverFile || undefined)
        if (uploadResult.fileUrl) {
          fileUrl = uploadResult.fileUrl
          storageBucket = uploadResult.storageBucket || 'artist-music'
          storagePath = uploadResult.storagePath || null
        }
        if (uploadResult.coverUrl) {
          coverUrl = uploadResult.coverUrl
        }
      }

      const updatePayload = {
        id: editingTrack!.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        genre: formData.genre,
        release_date: formData.release_date || new Date().toISOString().split('T')[0],
        duration: musicFile ? await getAudioDuration(musicFile) : formData.duration,
        file_url: fileUrl,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        cover_art_url: coverUrl,
        lyrics: formData.lyrics,
        spotify_url: formData.spotify_url,
        apple_music_url: formData.apple_music_url,
        soundcloud_url: formData.soundcloud_url,
        youtube_url: formData.youtube_url,
        tags: formData.tags,
        is_featured: formData.is_featured,
        is_public: formData.is_public,
        access_mode: formData.access_mode,
        allow_library_add: formData.allow_library_add,
        allow_profile_feature: formData.allow_profile_feature,
        allow_downloads: formData.allow_downloads,
        rights_confirmed: formData.rights_confirmed || editingTrack?.rights_confirmed === true,
        rights_confirmed_at:
          formData.rights_confirmed || editingTrack?.rights_confirmed
            ? editingTrack?.rights_confirmed_at || new Date().toISOString()
            : null,
      }

      const { response: updateResponse, body: updateBody } = await fetchJsonWithTimeout('/api/artist/music', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
      if (!updateResponse.ok) throw new Error(parseMusicApiError(updateBody, 'Failed to update track'))
      
      toast.success('Track updated successfully!')
      
      setShowUploader(false)
      setEditingTrack(null)
      resetFormData()
      await Promise.all([loadTracks(), loadMusicListings()])
    } catch (error) {
      console.error('Error saving track:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save track')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!user) return

    try {
      const deleteResponse = await fetch('/api/artist/music', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trackId }),
      })
      const deleteBody = await deleteResponse.json().catch(() => ({}))
      if (!deleteResponse.ok) throw new Error(deleteBody?.error?.message || deleteBody?.error || 'Failed to delete track')
      
      toast.success('Track deleted successfully!')
      await Promise.all([loadTracks(), loadMusicListings()])
    } catch (error) {
      console.error('Error deleting track:', error)
      toast.error('Failed to delete track')
    } finally {
      setDeletingTrack(null)
    }
  }

  const currentlyPlaying =
    jukebox?.state.isPlaying ? jukebox.state.currentTrack?.id ?? null : null

  const handlePlayPause = (trackId: string) => {
    if (!jukebox) return
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    if (jukebox.state.currentTrack?.id === trackId && jukebox.state.isPlaying) {
      jukebox.pause()
      return
    }

    jukebox.play({
      id: track.id,
      title: track.title,
      artist_name: profile?.artist_name || "You",
      artist_id: user?.id,
      duration: track.duration,
      file_url: track.file_url || `/api/music/stream?trackId=${track.id}`,
      cover_art_url: track.cover_art_url,
      genre: track.genre,
      tags: track.tags || [],
      allow_downloads: track.allow_downloads,
      in_library: true,
    })
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

  const totalStats = getTotalStats()
  const filteredTracks = getFilteredTracks()
  const publicArtistSlug = profile?.url_slug || profile?.artist_name
  const publicMusicPath = publicArtistSlug
    ? `/artist/${encodeURIComponent(publicArtistSlug)}#public-artist-music`
    : null
  const isContextHydrating =
    !isAccountsReady ||
    isArtistLoading ||
    (hasActiveAccount && !user) ||
    !user

  const getListingForTrack = (trackId: string) =>
    musicListings.find(listing => listing.music_track_id === trackId)

  const openSellFlow = (track: MusicTrack, listing?: MarketplaceListing) => {
    if (listing) {
      router.push(`/artist/store?tab=listings&listing=${encodeURIComponent(listing.id)}`)
      return
    }
    router.push(`/artist/store?tab=listings&type=music&trackId=${encodeURIComponent(track.id)}`)
  }

  const retryPreviewGeneration = async (track: MusicTrack) => {
    try {
      await queuePreviewJob(track.id)
      toast.success('Preview generation queued.')
      await loadTracks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not queue preview generation')
    }
  }

  if (isContextHydrating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Music Library</h2>
          <p className="text-gray-400">Recognizing your active artist account...</p>
        </div>
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
            {filteredTracks.map((track) => {
              const listing = getListingForTrack(track.id)
              return (
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

	                    {listing && (
	                      <Badge className={`absolute bottom-2 left-2 border-0 ${listing.status === 'published' ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white'}`}>
	                        <ShoppingBag className="h-3 w-3 mr-1" />
	                        {listing.status === 'published' ? 'For sale' : 'Draft listing'}
	                      </Badge>
	                    )}

                    {track.preview_mode === 'clip' && track.preview_status && track.preview_status !== 'not_required' && (
                      <Badge className={`absolute bottom-2 right-2 border-0 ${
                        track.preview_status === 'ready'
                          ? 'bg-sky-600/90 text-white'
                          : track.preview_status === 'failed'
                            ? 'bg-red-600/90 text-white'
                            : 'bg-slate-600/90 text-white'
                      }`}>
                        {track.preview_status === 'ready'
                          ? 'Sample ready'
                          : track.preview_status === 'failed'
                            ? 'Sample failed'
                            : 'Sample pending'}
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
                    {listing ? (
                      <p className="text-emerald-300 text-sm">
                        {listing.base_price !== null ? `${listing.currency || 'USD'} ${Number(listing.base_price).toFixed(2)}` : 'Listed'} · {listing.status}
                      </p>
                    ) : null}
                    {track.listing_sync_status && track.listing_sync_status !== 'not_required' && (
                      <p className={`text-xs ${track.listing_sync_status === 'error' || track.listing_sync_status === 'blocked' ? 'text-red-300' : 'text-amber-300'}`}>
                        Listing sync: {track.listing_sync_status}
                        {track.listing_sync_error ? ` — ${track.listing_sync_error}` : ''}
                      </p>
                    )}
                    {!track.is_public && track.preview_mode === 'clip' && track.preview_status === 'ready' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
                        onClick={() => publishTrackWhenReady(track)}
                      >
                        Publish now
                      </Button>
                    )}
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
                        <DropdownMenuItem onClick={() => {
                          hydrateFormFromTrack(track)
                          setEditingTrack(track)
                          setShowUploader(true)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
	                        <DropdownMenuItem onClick={() => openSellFlow(track, listing)}>
	                          <ShoppingBag className="h-4 w-4 mr-2" />
	                          {listing ? 'Edit storefront listing' : 'Sell / Add to storefront'}
	                        </DropdownMenuItem>
                        {track.preview_mode === 'clip' && track.preview_status === 'failed' && (
                          <DropdownMenuItem onClick={() => retryPreviewGeneration(track)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry sample generation
                          </DropdownMenuItem>
                        )}
                        {!track.is_public && (
                          track.preview_mode !== 'clip' || track.preview_status === 'ready'
                        ) && (
                          <DropdownMenuItem onClick={() => publishTrackWhenReady(track)}>
                            <Globe className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {publicMusicPath && (
                          <DropdownMenuItem onClick={() => router.push(publicMusicPath)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Preview public track
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setDeletingTrack(track.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadTrack(track)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareTrack(track)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}

        {/* Upload/Edit Dialog */}
        <Dialog
          open={showUploader}
          onOpenChange={(open) => {
            setShowUploader(open)
            if (!open) {
              setEditingTrack(null)
              resetFormData()
            }
          }}
        >
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

                    <div className="flex flex-wrap items-center gap-4">
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
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="library-add"
                          checked={formData.allow_library_add}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_library_add: checked }))}
                        />
                        <Label htmlFor="library-add" className="text-gray-300">Library Adds</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="profile-feature"
                          checked={formData.allow_profile_feature}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_profile_feature: checked }))}
                        />
                        <Label htmlFor="profile-feature" className="text-gray-300">Profile Features</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="allow-download"
                          checked={formData.allow_downloads}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_downloads: checked }))}
                        />
                        <Label htmlFor="allow-download" className="text-gray-300">Allow Download</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="rights-confirmed"
                          checked={formData.rights_confirmed}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, rights_confirmed: checked }))}
                        />
                        <Label htmlFor="rights-confirmed" className="text-gray-300">Rights confirmed</Label>
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
                onCancel={() => {
                  setShowUploader(false)
                  resetFormData()
                }}
                isUploading={isUploading}
                progress={uploadProgress}
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
