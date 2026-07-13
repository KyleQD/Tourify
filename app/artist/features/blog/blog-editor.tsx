"use client"

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useArtist } from '@/contexts/artist-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { PostingAccountSelector } from '@/components/account/posting-account-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Save,
  ArrowLeft,
  Tag,
  Image as ImageIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Eye,
  Loader2,
  Music2,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { ARTIST_PRIMARY_BTN, ARTIST_OUTLINE_BTN } from '@/components/dashboard/artist-tokens'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS = [
  'Music News',
  'Artist Spotlight',
  'Event Coverage',
  'Album Review',
  'Interview',
  'Opinion',
  'Industry',
  'Local Scene',
  'Culture',
  'General',
]

interface BlogPost {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url?: string
  status: 'draft' | 'published'
  published_at?: string
  seo_title?: string
  seo_description?: string
  tags: string[]
  categories: string[]
  account_display_name?: string | null
  account_username?: string | null
  posted_as_type?: string | null
}

interface BlogEditorProps {
  postId?: string
  onBack: () => void
}

export default function BlogEditor({ postId, onBack }: BlogEditorProps) {
  const { user } = useArtist()
  const { actingHeaders, isActingReady } = useActingContext()
  const [post, setPost] = useState<BlogPost>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'draft',
    tags: [],
    categories: ['General'],
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPost, setIsLoadingPost] = useState(!!postId)
  const [newTag, setNewTag] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [trackIdInput, setTrackIdInput] = useState('')
  const [showTrackAttach, setShowTrackAttach] = useState(false)
  const [attachMusic, setAttachMusic] = useState<{ id: string; title: string } | null>(null)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      ...input,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...actingHeaders,
        ...(input?.headers || {}),
      },
    }
  }

  useEffect(() => {
    if (!postId) {
      setIsLoadingPost(false)
      return
    }

    if (!user || !isActingReady) {
      if (!user)
        setIsLoadingPost(false)
      return
    }

    loadPost()
  }, [postId, user, isActingReady])

  async function loadPost() {
    if (!postId || !user || !isActingReady) {
      setIsLoadingPost(false)
      return
    }

    try {
      setIsLoadingPost(true)
      const response = await fetch(`/api/pulse/articles/${postId}`, buildNoStoreInit())
      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to load blog post')

      const article = data.article
      const categories = Array.isArray(article.categories) && article.categories.length > 0
        ? article.categories
        : ['General']

      setPost({
        id: article.id,
        title: article.title || '',
        slug: article.slug || '',
        content: article.content || '',
        excerpt: article.excerpt || '',
        featured_image_url: article.featured_image_url || undefined,
        status: article.status === 'published' ? 'published' : 'draft',
        published_at: article.published_at || undefined,
        seo_title: article.seo_title || undefined,
        seo_description: article.seo_description || undefined,
        tags: Array.isArray(article.tags) ? article.tags : [],
        categories,
        account_display_name: article.account_display_name,
        account_username: article.account_username,
        posted_as_type: article.posted_as_type,
      })
      if (article.featured_image_url)
        setImagePreview(article.featured_image_url)
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load blog post')
    } finally {
      setIsLoadingPost(false)
    }
  }

  function insertMarkdown(before: string, after: string = '') {
    const textarea = document.getElementById('artist-blog-content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = post.content.slice(start, end)
    const replacement = `${before}${selected || 'text'}${after}`

    setPost(prev => ({
      ...prev,
      content: prev.content.slice(0, start) + replacement + prev.content.slice(end),
    }))

    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + before.length + (selected || 'text').length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  async function uploadFeaturedImage() {
    if (!imageFile || !user) return null

    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('artist-content')
        .upload(`blog-images/${fileName}`, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('artist-content')
        .getPublicUrl(`blog-images/${fileName}`)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload featured image')
      return null
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function addTag() {
    if (!newTag.trim() || post.tags.includes(newTag.trim()) || post.tags.length >= 10) return
    setPost(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()],
    }))
    setNewTag('')
  }

  function removeTag(tagToRemove: string) {
    setPost(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }))
  }

  function setCategory(category: string) {
    setPost(prev => ({
      ...prev,
      categories: [category],
    }))
  }

  async function attachTrack() {
    const id = trackIdInput.trim()
    if (!id) return

    try {
      const res = await fetch('/api/music/share', buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify({ musicId: id }),
      }))
      if (!res.ok) {
        toast.error('Track not found')
        return
      }
      const { payload } = await res.json()
      setAttachMusic({ id: payload.id, title: payload.title })
      setPost(prev => ({ ...prev, content: `${prev.content}\n\n[track:${payload.id}]` }))
      setTrackIdInput('')
      setShowTrackAttach(false)
      toast.success('Track attached to post')
    } catch {
      toast.error('Failed to fetch track')
    }
  }

  async function handleSave(status: 'draft' | 'published' = 'draft') {
    if (!user || !isActingReady) {
      toast.error('Account is still preparing. Try again in a moment.')
      return
    }

    if (!post.title.trim() || post.title.trim().length < 5) {
      toast.error('Title must be at least 5 characters')
      return
    }

    if (status === 'published' && post.content.trim().length < 50) {
      toast.error('Content must be at least 50 characters to publish')
      return
    }

    try {
      setIsLoading(true)

      let featuredImageUrl = post.featured_image_url || ''
      if (imageFile) {
        const uploadedUrl = await uploadFeaturedImage()
        if (uploadedUrl)
          featuredImageUrl = uploadedUrl
      }

      const payload = {
        title: post.title.trim(),
        content: post.content.trim() || 'Draft in progress...',
        excerpt: post.excerpt.trim() || undefined,
        tags: post.tags,
        categories: post.categories.length > 0 ? post.categories : ['General'],
        featuredImageUrl: featuredImageUrl || undefined,
        status,
        seoTitle: post.seo_title || undefined,
        seoDescription: post.seo_description || undefined,
      }

      const response = await fetch(
        postId ? `/api/pulse/articles/${postId}` : '/api/pulse/articles',
        buildNoStoreInit({
          method: postId ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        })
      )

      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Failed to save blog post')

      if (data.article?.id)
        setPost(prev => ({ ...prev, id: data.article.id, slug: data.article.slug || prev.slug }))

      const slug = data.article?.slug
      if (status === 'published' && slug) {
        toast.success('Article published! It will appear in your followers\' feeds.', {
          action: {
            label: 'View live',
            onClick: () => window.open(`/blog/${slug}`, '_blank', 'noopener,noreferrer'),
          },
        })
      } else {
        toast.success(
          postId ? 'Blog post updated successfully!' : 'Draft saved successfully!'
        )
      }

      setTimeout(() => {
        onBack()
      }, 600)
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save blog post')
    } finally {
      setIsLoading(false)
    }
  }

  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))
  const selectedCategory = post.categories[0] || 'General'
  const canSubmit = isActingReady && !isLoading

  if (isLoadingPost) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
        <span className="sr-only">Loading blog post</span>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
          <h1 className="text-2xl font-bold text-white">
            {postId ? 'Edit Blog Post' : 'Create Blog Post'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreview(!isPreview)}
            className={cn(ARTIST_OUTLINE_BTN, 'border-gray-700')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={!canSubmit}
            className="border-gray-700 text-gray-300"
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave('published')}
            disabled={!canSubmit}
            className={ARTIST_PRIMARY_BTN}
          >
            {isLoading ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>

      {!isActingReady && (
        <p className="text-sm text-slate-400" role="status">
          Preparing account…
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!postId ? (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4">
                <PostingAccountSelector />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4 text-sm text-slate-300">
                Posted as{' '}
                <span className="font-medium text-white">
                  {post.account_display_name || post.account_username || 'Your account'}
                </span>
                {post.posted_as_type ? (
                  <span className="text-slate-500"> · {post.posted_as_type}</span>
                ) : null}
              </CardContent>
            </Card>
          )}

          {isPreview ? (
            <PreviewPane
              title={post.title}
              content={post.content}
              excerpt={post.excerpt}
              featuredImageUrl={imagePreview || post.featured_image_url || ''}
              category={selectedCategory}
              tags={post.tags}
              wordCount={wordCount}
              readingTime={readingTime}
            />
          ) : (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Post Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-300">Title</Label>
                  <Input
                    id="title"
                    value={post.title}
                    onChange={(e) => setPost(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter post title..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {postId && post.slug && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Slug</Label>
                    <Input
                      value={post.slug}
                      readOnly
                      className="bg-slate-800/60 border-slate-700 text-slate-400"
                    />
                    <p className="text-xs text-gray-500">Public URL: /blog/{post.slug}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="excerpt" className="text-gray-300">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={post.excerpt}
                    onChange={(e) => setPost(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Brief description of your post..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/40 p-2">
                  <ToolbarBtn icon={Bold} label="Bold" onClick={() => insertMarkdown('**', '**')} />
                  <ToolbarBtn icon={Italic} label="Italic" onClick={() => insertMarkdown('*', '*')} />
                  <div className="mx-1 h-5 w-px bg-slate-600" />
                  <ToolbarBtn icon={Heading1} label="Heading" onClick={() => insertMarkdown('\n## ', '\n')} />
                  <ToolbarBtn icon={Heading2} label="Subheading" onClick={() => insertMarkdown('\n### ', '\n')} />
                  <div className="mx-1 h-5 w-px bg-slate-600" />
                  <ToolbarBtn icon={List} label="Bullet list" onClick={() => insertMarkdown('\n- ', '')} />
                  <ToolbarBtn icon={ListOrdered} label="Numbered list" onClick={() => insertMarkdown('\n1. ', '')} />
                  <ToolbarBtn icon={Quote} label="Quote" onClick={() => insertMarkdown('\n> ', '\n')} />
                  <div className="mx-1 h-5 w-px bg-slate-600" />
                  <ToolbarBtn icon={Link2} label="Link" onClick={() => insertMarkdown('[', '](url)')} />
                  <ToolbarBtn icon={ImageIcon} label="Image" onClick={() => insertMarkdown('![alt](', ')')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist-blog-content" className="text-gray-300">Content</Label>
                  <Textarea
                    id="artist-blog-content"
                    value={post.content}
                    onChange={(e) => setPost(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your blog post content..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[400px]"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{wordCount} words · {post.content.length} characters</span>
                    <span>~{readingTime} min read</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-purple-500/30 text-purple-300"
                      onClick={() => setShowTrackAttach(prev => !prev)}
                    >
                      <Music2 className="h-4 w-4 mr-2" />
                      Attach Music
                    </Button>
                    {attachMusic && (
                      <span className="text-xs text-gray-400">Attached: {attachMusic.title}</span>
                    )}
                  </div>
                  {showTrackAttach && (
                    <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                      <Input
                        value={trackIdInput}
                        onChange={(e) => setTrackIdInput(e.target.value)}
                        placeholder="Paste a track ID"
                        aria-label="Track ID to attach"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                      <Button type="button" onClick={attachTrack} disabled={!trackIdInput.trim()}>
                        Attach
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Featured Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image" className="text-gray-300">Upload Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-800">
                  <Image
                    src={imagePreview}
                    alt="Featured image preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      selectedCategory === cat
                        ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="bg-slate-800 border-slate-700 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button onClick={addTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-600/20 text-purple-300"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      className="ml-1 hover:text-white"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title" className="text-gray-300">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={post.seo_title || ''}
                  onChange={(e) => setPost(prev => ({ ...prev, seo_title: e.target.value }))}
                  placeholder="SEO optimized title..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description" className="text-gray-300">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={post.seo_description || ''}
                  onChange={(e) => setPost(prev => ({ ...prev, seo_description: e.target.value }))}
                  placeholder="SEO meta description..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function PreviewPane({
  title,
  content,
  excerpt,
  featuredImageUrl,
  category,
  tags,
  wordCount,
  readingTime,
}: {
  title: string
  content: string
  excerpt: string
  featuredImageUrl: string
  category: string
  tags: string[]
  wordCount: number
  readingTime: number
}) {
  const paragraphs = content.split('\n').filter(Boolean)

  return (
    <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
      <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center text-xs text-slate-400">
        Preview Mode
      </div>

      {featuredImageUrl && (
        <div className="overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featuredImageUrl} alt="" className="h-64 w-full object-cover" />
        </div>
      )}

      <div className="space-y-1">
        <span className="text-xs font-medium text-purple-400">{category}</span>
        <h2 className="text-3xl font-bold text-white md:text-4xl">{title || 'Untitled Article'}</h2>
      </div>

      {excerpt && <p className="text-base text-slate-300">{excerpt}</p>}

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{wordCount} words</span>
        <span>{readingTime} min read</span>
      </div>

      <div className="space-y-4 border-t border-white/10 pt-6">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-relaxed text-slate-300 whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-4">
          {tags.map(tag => (
            <span key={tag} className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs text-purple-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
