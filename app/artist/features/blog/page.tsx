"use client"

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useArtist } from '@/contexts/artist-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  FileText,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MoreHorizontal,
  TrendingUp,
  Clock,
  Heart,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { TrackEmbed } from '@/components/blog/renderers/track-embed'
import BlogEditor from './blog-editor'
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
import { ARTIST_PRIMARY_BTN, ARTIST_CARD } from '@/components/dashboard/artist-tokens'
import { cn } from '@/lib/utils'

interface BlogPost {
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

function parseStatusFilter(value: string | null) {
  if (value === 'draft' || value === 'published') return value
  return 'all'
}

function BlogPageContent() {
  const { user, isLoading: isArtistLoading, refreshStats } = useArtist()
  const { actingHeaders, isActingReady } = useActingContext()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => parseStatusFilter(searchParams.get('status')))
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

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
        throw new Error(data.error || 'Failed to load blog posts')

      setPosts(
        (data.articles || []).map((article: BlogPost) => ({
          ...article,
          tags: Array.isArray(article.tags) ? article.tags : [],
          categories: Array.isArray(article.categories) ? article.categories : [],
          stats: article.stats || { views: 0, likes: 0, comments: 0, shares: 0 },
        }))
      )
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load blog posts')
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

    const editId = searchParams.get('edit')
    const wantsNew = searchParams.get('new') === '1'

    if (editId) {
      setEditingPostId(editId)
      setShowEditor(true)
      return
    }

    if (wantsNew) {
      setEditingPostId(null)
      setShowEditor(true)
    }
  }, [searchParams])

  function syncStatusToUrl(nextStatus: string) {
    setStatusFilter(nextStatus)
    const params = new URLSearchParams(searchParams.toString())
    if (nextStatus === 'all')
      params.delete('status')
    else
      params.set('status', nextStatus)

    const query = params.toString()
    router.replace(query ? `/artist/features/blog?${query}` : '/artist/features/blog', { scroll: false })
  }

  function clearEditorQueryParams() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('new')
    params.delete('edit')
    const query = params.toString()
    router.replace(query ? `/artist/features/blog?${query}` : '/artist/features/blog', { scroll: false })
  }

  function openNewPost() {
    setEditingPostId(null)
    setShowEditor(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('edit')
    params.set('new', '1')
    router.replace(`/artist/features/blog?${params.toString()}`, { scroll: false })
  }

  function openEditPost(postId: string) {
    setEditingPostId(postId)
    setShowEditor(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('new')
    params.set('edit', postId)
    router.replace(`/artist/features/blog?${params.toString()}`, { scroll: false })
  }

  function handleCardPrimaryAction(post: BlogPost) {
    if (post.status === 'published' && post.slug) {
      window.open(`/blog/${post.slug}`, '_blank', 'noopener,noreferrer')
      return
    }
    openEditPost(post.id)
  }

  function clearFilters() {
    setSearchQuery('')
    setCategoryFilter('all')
    syncStatusToUrl('all')
  }

  async function handleDeletePost(postId: string) {
    if (!user || !isActingReady) return

    try {
      const response = await fetch(`/api/pulse/articles/${postId}`, buildRequestInit({ method: 'DELETE' }))
      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to delete blog post')

      setPosts(prev => prev.filter(p => p.id !== postId))
      await refreshStats()
      toast.success('Blog post deleted successfully')
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete blog post')
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
                tags: Array.isArray(data.article?.tags) ? data.article.tags : p.tags,
                categories: Array.isArray(data.article?.categories) ? data.article.categories : p.categories,
                stats: data.article?.stats || p.stats,
              }
            : p
        )
      )

      await refreshStats()

      if (newStatus === 'published' && data.article?.slug) {
        toast.success('Post published successfully', {
          action: {
            label: 'View live',
            onClick: () => window.open(`/blog/${data.article.slug}`, '_blank', 'noopener,noreferrer'),
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
    const tags = Array.isArray(post.tags) ? post.tags : []
    const categories = Array.isArray(post.categories) ? post.categories : []
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || categories.includes(categoryFilter)

    return matchesSearch && matchesStatus && matchesCategory
  })

  function getUniqueCategories() {
    const categories = new Set<string>()
    posts.forEach(post => {
      const list = Array.isArray(post.categories) ? post.categories : []
      list.forEach(cat => categories.add(cat))
    })
    return Array.from(categories)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'published':
        return 'bg-green-600/20 text-green-300'
      case 'draft':
        return 'bg-gray-600/20 text-gray-300'
      default:
        return 'bg-gray-600/20 text-gray-300'
    }
  }

  function getTotalStats() {
    return posts.reduce(
      (acc, post) => ({
        totalPosts: acc.totalPosts + 1,
        totalViews: acc.totalViews + (post.stats?.views || 0),
        totalLikes: acc.totalLikes + (post.stats?.likes || 0),
        publishedPosts: acc.publishedPosts + (post.status === 'published' ? 1 : 0),
      }),
      { totalPosts: 0, totalViews: 0, totalLikes: 0, publishedPosts: 0 }
    )
  }

  if (showEditor) {
    return (
      <BlogEditor
        postId={editingPostId || undefined}
        onBack={() => {
          setShowEditor(false)
          setEditingPostId(null)
          clearEditorQueryParams()
          loadPosts()
          refreshStats()
        }}
      />
    )
  }

  const showSkeletons = isLoading || isArtistLoading || (Boolean(user) && !isActingReady)
  const stats = getTotalStats()
  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery.trim().length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <nav className="flex items-center gap-1 text-sm text-slate-400" aria-label="Breadcrumb">
            <Link href="/artist/content" className="hover:text-white transition-colors">
              Content Hub
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">Blog</span>
          </nav>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Blog</h1>
              <p className="text-gray-400">Share your thoughts and connect with your audience</p>
            </div>
          </div>
        </div>
        <Button
          onClick={openNewPost}
          disabled={!isActingReady}
          className={cn(ARTIST_PRIMARY_BTN, 'w-full sm:w-auto')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {!isActingReady && user && (
        <p className="text-sm text-slate-400" role="status">
          Preparing account…
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Posts</p>
                <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Published</p>
                <p className="text-2xl font-bold text-white">{stats.publishedPosts}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={ARTIST_CARD}>
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
      </div>

      <Card className={ARTIST_CARD}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search blog posts"
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={syncStatusToUrl}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-800 border-slate-700 text-white" aria-label="Filter by status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-800 border-slate-700 text-white" aria-label="Filter by category">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showSkeletons ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-live="polite">
          <span className="sr-only">Loading blog posts</span>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-full mb-4" />
                <div className="h-3 bg-slate-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className={ARTIST_CARD}>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {posts.length === 0 ? 'No blog posts yet' : 'No posts match your filters'}
            </h3>
            <p className="text-gray-400 mb-6">
              {posts.length === 0
                ? 'Start sharing your thoughts and connect with your audience by creating your first blog post.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {posts.length === 0 ? (
              <Button onClick={openNewPost} disabled={!isActingReady} className={ARTIST_PRIMARY_BTN}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Post
              </Button>
            ) : hasActiveFilters ? (
              <Button onClick={clearFilters} variant="outline" className="border-slate-600 text-slate-200">
                Clear filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const tags = Array.isArray(post.tags) ? post.tags : []
            return (
              <Card key={post.id} className="bg-slate-900/50 border-slate-700/50 group hover:border-purple-500/50 transition-all duration-200">
                <CardContent className="p-0">
                  {post.featured_image_url && (
                    <button
                      type="button"
                      onClick={() => handleCardPrimaryAction(post)}
                      className="relative h-48 w-full block"
                      aria-label={post.status === 'published' ? `View ${post.title}` : `Edit ${post.title}`}
                    >
                      <Image
                        src={post.featured_image_url}
                        alt={post.title}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    </button>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleCardPrimaryAction(post)}
                          className="text-left w-full"
                        >
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                            {post.title}
                          </h3>
                        </button>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {post.excerpt || `${(post.content || '').replace(/\[track:[^\]]+\]/g, '').slice(0, 100)}...`}
                        </p>
                      </div>
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
                          <DropdownMenuItem
                            onClick={() => openEditPost(post.id)}
                            className="text-gray-300 hover:text-white"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {post.status === 'published' && (
                            <DropdownMenuItem
                              onClick={() => window.open(`/blog/${post.slug}`, '_blank', 'noopener,noreferrer')}
                              className="text-gray-300 hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                          )}
                          {post.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(post.id, 'published')}
                              className="text-gray-300 hover:text-white"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {post.status === 'published' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(post.id, 'draft')}
                              className="text-gray-300 hover:text-white"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            onClick={() => setDeletePostId(post.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {(post.content || '').includes('[track:') && (
                      <div className="mt-3">
                        {(post.content || '').match(/\[track:([^\]]+)\]/g)?.slice(0, 1).map((tok) => {
                          const id = tok.replace('[track:', '').replace(']', '')
                          return <TrackEmbed key={id} id={id} />
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(post.published_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.stats?.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.stats?.likes || 0}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(post.updated_at || post.created_at), 'MMM d')}
                      </span>
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs border-purple-500/30 text-purple-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge variant="outline" className="text-xs border-gray-500/30 text-gray-400">
                            +{tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this blog post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && handleDeletePost(deletePostId)}
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

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status">
          <span className="sr-only">Loading blog</span>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-full mb-4" />
                <div className="h-3 bg-slate-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      }
    >
      <BlogPageContent />
    </Suspense>
  )
}
