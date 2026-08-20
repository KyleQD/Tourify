'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'

type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived'
type StatusFilter = 'all' | 'published' | 'draft'

interface ManagedArticle {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  status: ArticleStatus
  published_at: string | null
  updated_at: string
  stats?: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
  }
  format?: 'blog' | 'article' | 'press_release'
  url?: string
}

interface EditState {
  id: string
  title: string
  excerpt: string
  content: string
}

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'published' || value === 'draft') return value
  return 'all'
}

function statusBadgeClass(status: ArticleStatus) {
  if (status === 'published') return 'border-emerald-400/30 text-emerald-200'
  if (status === 'draft') return 'border-slate-400/30 text-slate-200'
  if (status === 'scheduled') return 'border-cyan-400/30 text-cyan-200'
  return 'border-amber-400/30 text-amber-200'
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not published'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function articleUrl(article: ManagedArticle) {
  return article.url || `/blog/${article.slug}`
}

export default function ManageBlogArticlesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [articles, setArticles] = useState<ManagedArticle[]>([])
  const [isLoadingArticles, setIsLoadingArticles] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get('status'))
  )
  const [editing, setEditing] = useState<EditState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ManagedArticle | null>(null)

  const generalActingHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'x-acting-account-type': 'general',
      'x-acting-profile-id': user?.id || '',
    }
  }, [user?.id])

  const loadArticles = useCallback(async () => {
    if (!user?.id) return

    setIsLoadingArticles(true)
    try {
      const response = await fetch('/api/pulse/articles?mine=1&limit=100', {
        credentials: 'include',
        cache: 'no-store',
        headers: generalActingHeaders(),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load articles')
      }

      setArticles(Array.isArray(data.articles) ? data.articles : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load articles')
      setArticles([])
    } finally {
      setIsLoadingArticles(false)
    }
  }, [generalActingHeaders, user?.id])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, router, user])

  useEffect(() => {
    if (!loading && user?.id) void loadArticles()
  }, [loadArticles, loading, user?.id])

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return articles.filter(article => {
      const matchesStatus = statusFilter === 'all' || article.status === statusFilter
      if (!matchesStatus) return false
      if (!normalizedQuery) return true
      return [
        article.title,
        article.excerpt,
        article.slug,
        article.format || '',
      ].some(value => value.toLowerCase().includes(normalizedQuery))
    })
  }, [articles, query, statusFilter])

  function openEditor(article: ManagedArticle) {
    setEditing({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || '',
      content: article.content || '',
    })
  }

  async function updateArticle(articleId: string, body: Record<string, unknown>) {
    setIsMutating(true)
    try {
      const response = await fetch(`/api/pulse/articles/${articleId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: generalActingHeaders(),
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Article update failed')
      }

      setArticles(current =>
        current.map(article => article.id === articleId ? data.article : article)
      )
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Article update failed')
      return false
    } finally {
      setIsMutating(false)
    }
  }

  async function saveEditingArticle() {
    if (!editing) return
    if (editing.title.trim().length < 5) {
      toast.error('Title must be at least 5 characters')
      return
    }

    const saved = await updateArticle(editing.id, {
      title: editing.title.trim(),
      excerpt: editing.excerpt.trim() || undefined,
      content: editing.content.trim() || 'Draft in progress...',
    })

    if (saved) {
      toast.success('Article updated')
      setEditing(null)
    }
  }

  async function changeStatus(article: ManagedArticle, status: 'draft' | 'published') {
    const updated = await updateArticle(article.id, { status })
    if (updated) {
      toast.success(status === 'published' ? 'Article published' : 'Article unpublished')
    }
  }

  async function deleteArticle() {
    if (!deleteTarget) return

    setIsMutating(true)
    try {
      const response = await fetch(`/api/pulse/articles/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: generalActingHeaders(),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Delete failed')
      }

      setArticles(current => current.filter(article => article.id !== deleteTarget.id))
      toast.success('Article deleted')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setIsMutating(false)
    }
  }

  if (loading || (!user && !loading)) return null

  return (
    <div className="min-h-screen bg-[#03030a] pb-24 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button
              type="button"
              variant="ghost"
              className="mb-4 px-0 text-slate-400 hover:bg-transparent hover:text-white"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Blogs/Articles</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage writing published from your general account.
            </p>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-500 hover:to-purple-500"
          >
            <Link href="/blog/new?from=general">
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Link>
          </Button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search your articles"
              className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'all', label: 'All' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Drafts' },
            ] as const).map(option => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={statusFilter === option.value ? 'default' : 'outline'}
                className={
                  statusFilter === option.value
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'border-white/15 text-slate-300 hover:bg-white/10'
                }
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Refresh articles"
              className="h-9 w-9 border-white/15 text-slate-300 hover:bg-white/10"
              onClick={() => void loadArticles()}
              disabled={isLoadingArticles}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingArticles ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {isLoadingArticles ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <span className="sr-only">Loading articles</span>
            {[0, 1, 2].map(index => (
              <Card key={index} className="animate-pulse border-white/10 bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="h-5 w-1/3 rounded bg-white/10" />
                  <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="border-white/10 bg-white/[0.04]">
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-500" />
              <h2 className="text-xl font-semibold">
                {articles.length === 0 ? 'No articles yet' : 'No articles match your filters'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {articles.length === 0
                  ? 'Create your first article or save a draft from the composer.'
                  : 'Adjust the search or status filter to see more results.'}
              </p>
              {articles.length === 0 ? (
                <Button asChild className="mt-6 bg-white text-black hover:bg-white/90">
                  <Link href="/blog/new?from=general">
                    <Plus className="mr-2 h-4 w-4" />
                    New Article
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map(article => (
              <Card key={article.id} className="border-white/10 bg-white/[0.04]">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={statusBadgeClass(article.status)}>
                          {article.status}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Updated {formatDate(article.updated_at)}
                        </span>
                        {article.published_at ? (
                          <span className="text-xs text-slate-500">
                            Published {formatDate(article.published_at)}
                          </span>
                        ) : null}
                      </div>
                      <CardTitle className="truncate text-xl text-white">{article.title}</CardTitle>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {article.excerpt || 'No summary yet.'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-white/15 text-slate-300 hover:bg-white/10"
                        onClick={() => openEditor(article)}
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {article.status === 'published' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/15 text-slate-300 hover:bg-white/10"
                          onClick={() => void changeStatus(article, 'draft')}
                          disabled={isMutating}
                        >
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-500"
                          onClick={() => void changeStatus(article, 'published')}
                          disabled={isMutating}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Publish
                        </Button>
                      )}
                      {article.status === 'published' ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-white/15 text-slate-300 hover:bg-white/10"
                        >
                          <Link href={articleUrl(article)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                        onClick={() => setDeleteTarget(article)}
                        disabled={isMutating}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-5 text-xs text-slate-500">
                  <span>{article.stats?.views || 0} views</span>
                  <span>{article.stats?.likes || 0} likes</span>
                  <span>{article.stats?.shares || 0} shares</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription className="text-slate-400">
              Changes are saved to your general account article.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <Input
                value={editing.title}
                onChange={event => setEditing(current => current ? { ...current, title: event.target.value } : current)}
                placeholder="Article title"
                className="border-white/10 bg-white/5 text-white"
              />
              <Input
                value={editing.excerpt}
                onChange={event => setEditing(current => current ? { ...current, excerpt: event.target.value } : current)}
                placeholder="Summary"
                className="border-white/10 bg-white/5 text-white"
              />
              <Textarea
                value={editing.content}
                onChange={event => setEditing(current => current ? { ...current, content: event.target.value } : current)}
                placeholder="Article content"
                className="min-h-72 border-white/10 bg-white/5 text-white"
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/15 text-slate-300 hover:bg-white/10"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-white text-black hover:bg-white/90"
              onClick={() => void saveEditingArticle()}
              disabled={isMutating}
            >
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-slate-950 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This removes the article from your general account. Published feed previews are also cleaned up by the existing article API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={event => {
                event.preventDefault()
                void deleteArticle()
              }}
              disabled={isMutating}
            >
              {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
