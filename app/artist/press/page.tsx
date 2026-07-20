'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useArtist } from '@/contexts/artist-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MoreHorizontal,
  TrendingUp,
  Heart,
  ExternalLink,
  Share2,
  Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import PressEditor from './press-editor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Image from 'next/image'
import { ARTIST_CARD, ARTIST_OUTLINE_BTN, ARTIST_PRIMARY_BTN } from '@/components/dashboard/artist-tokens'
import { cn } from '@/lib/utils'
import {
  PRESS_FORMAT_LABELS,
  PRESS_FORMATS,
  isPressFormat,
  parsePressFormat,
  publicUrlForPressItem,
  type PressFormat,
} from '@/lib/press/formats'
import { PressTypeBadge } from '@/components/press/press-type-badge'
import { PressFormatPicker } from '@/components/press/press-format-picker'
import { PressReleaseShareDialog } from '@/components/press/press-release-share-dialog'

interface PressPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url?: string | null
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  published_at?: string | null
  scheduled_for?: string | null
  tags: string[]
  categories: string[]
  format?: PressFormat
  subtitle?: string | null
  boilerplate?: string | null
  embargo_until?: string | null
  stats: {
    views: number
    likes: number
    comments: number
    shares: number
  }
  created_at: string
  updated_at: string
  url?: string
}

type TypeFilter = 'all' | PressFormat
type StatusFilter = 'all' | 'published' | 'draft'

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'draft' || value === 'published') return value
  return 'all'
}

function parseTypeFilter(value: string | null): TypeFilter {
  if (value === 'all' || value == null || value === '') return 'all'
  return parsePressFormat(value, 'blog')
}

function getPostFormat(post: PressPost): PressFormat {
  return parsePressFormat(post.format, 'blog')
}

function getStatusColor(status: string) {
  if (status === 'published') return 'bg-green-600/20 text-green-300'
  if (status === 'draft') return 'bg-gray-600/20 text-gray-300'
  return 'bg-gray-600/20 text-gray-300'
}

function PressRowActions({
  post,
  onEdit,
  onShare,
  onStatusChange,
  onDelete,
}: {
  post: PressPost
  onEdit: () => void
  onShare: () => void
  onStatusChange: (status: 'draft' | 'published') => void
  onDelete: () => void
}) {
  const postFormat = getPostFormat(post)
  const viewUrl = publicUrlForPressItem({
    format: postFormat,
    slug: post.slug,
    id: post.id,
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          aria-label={`Actions for ${post.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
        <DropdownMenuItem onClick={onEdit} className="text-gray-300 hover:text-white">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {post.status === 'published' && (
          <DropdownMenuItem
            onClick={() => window.open(viewUrl, '_blank', 'noopener,noreferrer')}
            className="text-gray-300 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
        )}
        {post.status === 'published' && postFormat === 'press_release' && (
          <DropdownMenuItem onClick={onShare} className="text-gray-300 hover:text-white">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
        )}
        {post.status === 'draft' && (
          <DropdownMenuItem
            onClick={() => onStatusChange('published')}
            className="text-gray-300 hover:text-white"
          >
            <Eye className="h-4 w-4 mr-2" />
            Publish
          </DropdownMenuItem>
        )}
        {post.status === 'published' && (
          <DropdownMenuItem
            onClick={() => onStatusChange('draft')}
            className="text-gray-300 hover:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Unpublish
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:text-red-300">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PressPageContent() {
  const { user, isLoading: isArtistLoading, refreshStats } = useArtist()
  const { actingHeaders, isActingReady } = useActingContext()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [posts, setPosts] = useState<PressPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [showFormatPicker, setShowFormatPicker] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editorFormat, setEditorFormat] = useState<PressFormat>('blog')
  const [titleFilter, setTitleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get('status'))
  )
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() => parseTypeFilter(searchParams.get('type')))
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null)

  const buildRequestInit = useCallback((input?: RequestInit): RequestInit => {
    return {
      credentials: 'include',
      cache: 'no-store',
      ...input,
      headers: {
        'Content-Type': 'application/json',
        ...actingHeaders,
        ...(input?.headers || {}),
      },
    }
  }, [actingHeaders])

  const loadPosts = useCallback(async () => {
    if (!user || !isActingReady) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/pulse/articles?mine=1&limit=100', buildRequestInit())
      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to load press library')

      setPosts(
        (data.articles || []).map((article: PressPost) => ({
          ...article,
          format: article.format || 'blog',
          tags: Array.isArray(article.tags) ? article.tags : [],
          categories: Array.isArray(article.categories) ? article.categories : [],
          stats: article.stats || { views: 0, likes: 0, comments: 0, shares: 0 },
        }))
      )
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load press library')
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }, [user, isActingReady, buildRequestInit])

  useEffect(() => {
    if (isArtistLoading) return

    if (!user) {
      setIsLoading(false)
      setPosts([])
      return
    }

    if (!isActingReady) return

    loadPosts()
  }, [user, isArtistLoading, isActingReady, loadPosts])

  useEffect(() => {
    const nextStatus = parseStatusFilter(searchParams.get('status'))
    setStatusFilter(nextStatus)

    const nextType = parseTypeFilter(searchParams.get('type'))
    setTypeFilter(nextType)

    const editId = searchParams.get('edit')
    const wantsNew = searchParams.get('new') === '1'
    const typeParam = searchParams.get('type')

    if (editId) {
      setEditingPostId(editId)
      setShowFormatPicker(false)
      setShowEditor(true)
      return
    }

    if (wantsNew) {
      setEditingPostId(null)
      if (isPressFormat(typeParam)) {
        setEditorFormat(typeParam)
        setShowFormatPicker(false)
        setShowEditor(true)
      } else {
        setShowEditor(false)
        setShowFormatPicker(true)
      }
    }
  }, [searchParams])

  function syncStatusToUrl(nextStatus: StatusFilter) {
    setStatusFilter(nextStatus)
    const params = new URLSearchParams(searchParams.toString())
    if (nextStatus === 'all')
      params.delete('status')
    else
      params.set('status', nextStatus)

    const query = params.toString()
    router.replace(query ? `/artist/press?${query}` : '/artist/press', { scroll: false })
  }

  function syncTypeToUrl(nextType: TypeFilter) {
    setTypeFilter(nextType)
    const params = new URLSearchParams(searchParams.toString())
    if (nextType === 'all')
      params.delete('type')
    else
      params.set('type', nextType)

    const query = params.toString()
    router.replace(query ? `/artist/press?${query}` : '/artist/press', { scroll: false })
  }

  function clearEditorQueryParams() {
    const params = new URLSearchParams(searchParams.toString())
    const wasCreating = params.get('new') === '1'
    params.delete('new')
    params.delete('edit')
    if (wasCreating)
      params.delete('type')
    const query = params.toString()
    router.replace(query ? `/artist/press?${query}` : '/artist/press', { scroll: false })
  }

  function openNewPost() {
    setEditingPostId(null)
    setShowEditor(false)
    setShowFormatPicker(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('edit')
    params.delete('type')
    params.set('new', '1')
    router.replace(`/artist/press?${params.toString()}`, { scroll: false })
  }

  function openNewWithFormat(formatOption: PressFormat) {
    setEditingPostId(null)
    setEditorFormat(formatOption)
    setShowFormatPicker(false)
    setShowEditor(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('edit')
    params.set('new', '1')
    params.set('type', formatOption)
    router.replace(`/artist/press?${params.toString()}`, { scroll: false })
  }

  function openEditPost(postId: string) {
    setEditingPostId(postId)
    setShowFormatPicker(false)
    setShowEditor(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('new')
    params.set('edit', postId)
    router.replace(`/artist/press?${params.toString()}`, { scroll: false })
  }

  function handleCardPrimaryAction(post: PressPost) {
    const postFormat = getPostFormat(post)
    if (post.status === 'published' && post.slug) {
      window.open(
        publicUrlForPressItem({ format: postFormat, slug: post.slug, id: post.id }),
        '_blank',
        'noopener,noreferrer'
      )
      return
    }
    openEditPost(post.id)
  }

  function handleSharePressRelease(post: PressPost) {
    setShareTarget({ id: post.id, title: post.title })
  }

  function clearFilters() {
    setTitleFilter('')
    setTypeFilter('all')
    setStatusFilter('all')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('type')
    const query = params.toString()
    router.replace(query ? `/artist/press?${query}` : '/artist/press', { scroll: false })
  }

  async function handleDeletePost(postId: string) {
    if (!user || !isActingReady) return

    try {
      const response = await fetch(`/api/pulse/articles/${postId}`, buildRequestInit({ method: 'DELETE' }))
      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to delete press item')

      setPosts(prev => prev.filter(p => p.id !== postId))
      await refreshStats()
      toast.success('Press item deleted successfully')
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete press item')
    } finally {
      setDeletePostId(null)
    }
  }

  async function handleStatusChange(postId: string, newStatus: 'draft' | 'published') {
    if (!user || !isActingReady) return

    try {
      const response = await fetch(
        `/api/pulse/articles/${postId}`,
        buildRequestInit({
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        })
      )
      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to update post status')

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                ...data.article,
                format: data.article?.format || p.format || 'blog',
                tags: Array.isArray(data.article?.tags) ? data.article.tags : p.tags,
                categories: Array.isArray(data.article?.categories) ? data.article.categories : p.categories,
                stats: data.article?.stats || p.stats,
              }
            : p
        )
      )

      await refreshStats()

      if (newStatus === 'published' && data.article?.slug) {
        const publishedFormat = parsePressFormat(
          data.article?.format || posts.find(p => p.id === postId)?.format,
          'blog'
        )
        const viewUrl = publicUrlForPressItem({
          format: publishedFormat,
          slug: data.article.slug,
          id: data.article.id || postId,
        })
        toast.success('Post published successfully', {
          action: {
            label: 'View live',
            onClick: () => window.open(viewUrl, '_blank', 'noopener,noreferrer'),
          },
        })
      } else {
        toast.success(`Post ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`)
      }
    } catch (error) {
      console.error('Error updating post status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update post status')
    }
  }

  const filteredPosts = posts.filter(post => {
    const postFormat = getPostFormat(post)
    const matchesTitle =
      !titleFilter.trim() || post.title.toLowerCase().includes(titleFilter.toLowerCase())
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesType = typeFilter === 'all' || postFormat === typeFilter
    return matchesTitle && matchesStatus && matchesType
  })

  function getTotalStats() {
    return posts.reduce(
      (acc, post) => {
        const postFormat = getPostFormat(post)
        return {
          totalPosts: acc.totalPosts + 1,
          totalViews: acc.totalViews + (post.stats?.views || 0),
          totalLikes: acc.totalLikes + (post.stats?.likes || 0),
          totalShares: acc.totalShares + (post.stats?.shares || 0),
          publishedPosts: acc.publishedPosts + (post.status === 'published' ? 1 : 0),
          draftPosts: acc.draftPosts + (post.status === 'draft' ? 1 : 0),
          byFormat: {
            ...acc.byFormat,
            [postFormat]: acc.byFormat[postFormat] + 1,
          },
        }
      },
      {
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        publishedPosts: 0,
        draftPosts: 0,
        byFormat: { blog: 0, article: 0, press_release: 0 } as Record<PressFormat, number>,
      }
    )
  }

  function closeEditorOrPicker() {
    setShowEditor(false)
    setShowFormatPicker(false)
    setEditingPostId(null)
    clearEditorQueryParams()
    loadPosts()
    refreshStats()
  }

  if (showFormatPicker) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={closeEditorOrPicker} className="text-gray-400 hover:text-white">
            Back to Press
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Choose a format</h1>
            <p className="text-sm text-gray-400">Create a blog, article, or press release</p>
          </div>
        </div>
        <PressFormatPicker onSelect={openNewWithFormat} />
      </div>
    )
  }

  if (showEditor) {
    return (
      <PressEditor
        postId={editingPostId || undefined}
        initialFormat={editorFormat}
        onBack={closeEditorOrPicker}
      />
    )
  }

  const showSkeletons = isLoading || isArtistLoading || (Boolean(user) && !isActingReady)
  const stats = getTotalStats()
  const hasActiveFilters =
    statusFilter !== 'all' || typeFilter !== 'all' || titleFilter.trim().length > 0
  const formatSubtitle = PRESS_FORMATS
    .map(f => `${stats.byFormat[f]} ${PRESS_FORMAT_LABELS[f]}${stats.byFormat[f] === 1 ? '' : 's'}`)
    .join(' · ')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Press</h1>
          <p className="max-w-xl text-sm text-slate-400">
            Manage blogs, articles, and press releases you authored — create, distribute, edit, and
            track performance.
          </p>
          <p className="text-xs text-slate-500">
            Booking kit lives in{' '}
            <Link href="/artist/epk" className="text-purple-300 hover:text-purple-200">
              EPK
            </Link>
            {' · '}
            <Link href="/artist/content" className="text-slate-400 hover:text-white">
              Content Hub
            </Link>
          </p>
        </div>
        <Button
          onClick={openNewPost}
          disabled={!isActingReady}
          className={cn(ARTIST_PRIMARY_BTN, 'w-full sm:w-auto')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {!isActingReady && user && (
        <p className="text-sm text-slate-400" role="status">
          Preparing account…
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-bold text-white">{stats.totalPosts}</p>
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{formatSubtitle || 'No items yet'}</p>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Published</p>
            <p className="mt-1 text-2xl font-bold text-white">{stats.publishedPosts}</p>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Drafts</p>
            <p className="mt-1 text-2xl font-bold text-white">{stats.draftPosts}</p>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">Views</p>
                <p className="mt-1 text-2xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">Likes</p>
                <p className="mt-1 text-2xl font-bold text-white">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <Heart className="h-4 w-4 text-rose-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">Shares</p>
                <p className="mt-1 text-2xl font-bold text-white">{stats.totalShares.toLocaleString()}</p>
              </div>
              <Share2 className="h-4 w-4 text-violet-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={ARTIST_CARD}>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
              <Button
                type="button"
                size="sm"
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => syncTypeToUrl('all')}
                className={typeFilter === 'all' ? ARTIST_PRIMARY_BTN : ARTIST_OUTLINE_BTN}
              >
                All
              </Button>
              {PRESS_FORMATS.map(formatOption => (
                <Button
                  key={formatOption}
                  type="button"
                  size="sm"
                  variant={typeFilter === formatOption ? 'default' : 'outline'}
                  onClick={() => syncTypeToUrl(formatOption)}
                  className={
                    typeFilter === formatOption ? ARTIST_PRIMARY_BTN : ARTIST_OUTLINE_BTN
                  }
                >
                  {formatOption === 'blog'
                    ? 'Blogs'
                    : formatOption === 'article'
                      ? 'Articles'
                      : 'Press Releases'}
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-56">
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Filter by title"
                value={titleFilter}
                onChange={event => setTitleFilter(event.target.value)}
                aria-label="Filter library by title"
                className="h-9 border-slate-700 bg-slate-800/80 pl-9 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(
              [
                { value: 'all', label: 'All status' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ] as const
            ).map(option => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={statusFilter === option.value ? 'default' : 'outline'}
                onClick={() => syncStatusToUrl(option.value)}
                className={
                  statusFilter === option.value
                    ? ARTIST_PRIMARY_BTN
                    : 'border-slate-600 text-slate-200'
                }
              >
                {option.label}
              </Button>
            ))}
            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-400 hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showSkeletons ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Loading press library</span>
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-4">
                <div className="h-4 w-1/3 rounded bg-slate-700" />
                <div className="mt-3 h-3 w-2/3 rounded bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className={ARTIST_CARD}>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-500" />
            <h3 className="mb-2 text-xl font-semibold text-white">
              {posts.length === 0 ? 'No press items yet' : 'No items match these filters'}
            </h3>
            <p className="mb-6 text-gray-400">
              {posts.length === 0
                ? 'Create a blog, article, or press release for this artist account.'
                : 'Clear filters or adjust status and format.'}
            </p>
            {posts.length === 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {PRESS_FORMATS.map(formatOption => (
                    <Button
                      key={formatOption}
                      onClick={() => openNewWithFormat(formatOption)}
                      disabled={!isActingReady}
                      className={ARTIST_PRIMARY_BTN}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New {PRESS_FORMAT_LABELS[formatOption]}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={openNewPost}
                  disabled={!isActingReady}
                  variant="outline"
                  className="border-slate-600 text-slate-200"
                >
                  Choose format
                </Button>
              </div>
            ) : hasActiveFilters ? (
              <Button onClick={clearFilters} variant="outline" className="border-slate-600 text-slate-200">
                Clear filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Analytics</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPosts.map(post => {
                  const postFormat = getPostFormat(post)
                  const dateValue = post.published_at || post.updated_at || post.created_at
                  return (
                    <tr key={post.id} className="bg-black/20 hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleCardPrimaryAction(post)}
                          className="text-left font-medium text-white hover:text-purple-300"
                        >
                          {post.title}
                        </button>
                        {post.excerpt ? (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{post.excerpt}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <PressTypeBadge format={postFormat} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(dateValue), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="inline-flex items-center gap-1" title="Views">
                            <Eye className="h-3.5 w-3.5" />
                            {post.stats?.views || 0}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Likes">
                            <Heart className="h-3.5 w-3.5" />
                            {post.stats?.likes || 0}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Shares">
                            <Share2 className="h-3.5 w-3.5" />
                            {post.stats?.shares || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PressRowActions
                          post={post}
                          onEdit={() => openEditPost(post.id)}
                          onShare={() => handleSharePressRelease(post)}
                          onStatusChange={status => handleStatusChange(post.id, status)}
                          onDelete={() => setDeletePostId(post.id)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredPosts.map(post => {
              const postFormat = getPostFormat(post)
              const dateValue = post.published_at || post.updated_at || post.created_at
              return (
                <Card key={post.id} className={cn(ARTIST_CARD, 'overflow-hidden')}>
                  <CardContent className="p-0">
                    {post.featured_image_url ? (
                      <button
                        type="button"
                        onClick={() => handleCardPrimaryAction(post)}
                        className="relative block h-36 w-full"
                        aria-label={post.status === 'published' ? `View ${post.title}` : `Edit ${post.title}`}
                      >
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ) : null}
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-2">
                          <PressTypeBadge format={postFormat} />
                          <button
                            type="button"
                            onClick={() => handleCardPrimaryAction(post)}
                            className="text-left text-base font-semibold text-white"
                          >
                            {post.title}
                          </button>
                        </div>
                        <PressRowActions
                          post={post}
                          onEdit={() => openEditPost(post.id)}
                          onShare={() => handleSharePressRelease(post)}
                          onStatusChange={status => handleStatusChange(post.id, status)}
                          onDelete={() => setDeletePostId(post.id)}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge variant="secondary" className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(dateValue), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.stats?.views || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.stats?.likes || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Share2 className="h-3 w-3" />
                          {post.stats?.shares || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="border-slate-700 bg-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Press Item</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && handleDeletePost(deletePostId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {shareTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-lg">
            <PressReleaseShareDialog
              pressPostId={shareTarget.id}
              title={shareTarget.title}
              onClose={() => {
                setShareTarget(null)
                void loadPosts()
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function PressPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3" role="status">
          <span className="sr-only">Loading press</span>
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-4">
                <div className="mb-2 h-4 w-1/3 rounded bg-slate-700" />
                <div className="h-3 w-2/3 rounded bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      }
    >
      <PressPageContent />
    </Suspense>
  )
}
