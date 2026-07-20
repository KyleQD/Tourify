'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Bold,
  Eye,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Save,
  Send,
  Tag,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PostingAccountSelector } from '@/components/account/posting-account-selector'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { toast } from 'sonner'

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

export default function NewArticlePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const { actingHeaders } = useActingContext()
  const isFromArtist = searchParams.get('from') === 'artist'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('General')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  function addTag() {
    const cleaned = tagInput.trim()
    if (!cleaned || tags.includes(cleaned) || tags.length >= 10) return
    setTags(prev => [...prev, cleaned])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function insertMarkdown(before: string, after: string = '') {
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(start, end)
    const replacement = `${before}${selected || 'text'}${after}`

    setContent(prev => prev.slice(0, start) + replacement + prev.slice(end))

    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + before.length + (selected || 'text').length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  async function handlePublish() {
    if (!title.trim() || title.trim().length < 5) {
      toast.error('Title must be at least 5 characters')
      return
    }
    if (!content.trim() || content.trim().length < 50) {
      toast.error('Content must be at least 50 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/pulse/articles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          excerpt: excerpt.trim() || undefined,
          tags,
          categories: [selectedCategory],
          featuredImageUrl: featuredImageUrl.trim() || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish')
      }

      toast.success('Article published! It will appear in your followers\' feeds.')
      if (isFromArtist)
        router.push('/artist/press')
      else
        router.push(data.article?.url || `/blog/${data.article?.slug}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish article')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveDraft() {
    if (!title.trim()) {
      toast.error('Add a title before saving')
      return
    }

    setIsSavingDraft(true)
    try {
      const response = await fetch('/api/pulse/articles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || 'Draft in progress...',
          excerpt: excerpt.trim() || undefined,
          tags,
          categories: [selectedCategory],
          featuredImageUrl: featuredImageUrl.trim() || undefined,
          status: 'draft',
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save draft')
      }

      toast.success('Draft saved')
      if (isFromArtist)
        router.push('/artist/press?status=draft')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  if (loading) return null

  return (
    <div className="min-h-screen bg-[#03030a] pb-24 pt-[calc(3.5rem+1rem)] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => (isFromArtist ? router.push('/artist/press') : router.back())}
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <Link
              href="/artist/press"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Manage posts
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/15 text-slate-300 hover:bg-white/10"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/15 text-slate-300 hover:bg-white/10"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !title.trim()}
            >
              {isSavingDraft ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-500 hover:to-purple-500"
              onClick={handlePublish}
              disabled={isSubmitting || !title.trim() || content.trim().length < 50}
            >
              {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Publish
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main editor — left 2/3 */}
          <div className="space-y-6 lg:col-span-2">
            <PostingAccountSelector />
            {isPreview ? (
              <PreviewPane
                title={title}
                content={content}
                excerpt={excerpt}
                featuredImageUrl={featuredImageUrl}
                category={selectedCategory}
                tags={tags}
                wordCount={wordCount}
                readingTime={readingTime}
              />
            ) : (
              <>
                {/* Title */}
                <div>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Your article title..."
                    className="h-14 border-0 border-b border-white/10 bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 focus-visible:border-fuchsia-500/50 focus-visible:ring-0 md:text-3xl"
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <Input
                    value={excerpt}
                    onChange={e => setExcerpt(e.target.value)}
                    placeholder="Write a brief summary to hook readers (optional)"
                    className="border-0 border-b border-white/5 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus-visible:border-fuchsia-500/30 focus-visible:ring-0"
                  />
                </div>

                {/* Formatting toolbar */}
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                  <ToolbarBtn icon={Bold} label="Bold" onClick={() => insertMarkdown('**', '**')} />
                  <ToolbarBtn icon={Italic} label="Italic" onClick={() => insertMarkdown('*', '*')} />
                  <div className="mx-1 h-5 w-px bg-white/10" />
                  <ToolbarBtn icon={Heading1} label="Heading" onClick={() => insertMarkdown('\n## ', '\n')} />
                  <ToolbarBtn icon={Heading2} label="Subheading" onClick={() => insertMarkdown('\n### ', '\n')} />
                  <div className="mx-1 h-5 w-px bg-white/10" />
                  <ToolbarBtn icon={List} label="Bullet list" onClick={() => insertMarkdown('\n- ', '')} />
                  <ToolbarBtn icon={ListOrdered} label="Numbered list" onClick={() => insertMarkdown('\n1. ', '')} />
                  <ToolbarBtn icon={Quote} label="Quote" onClick={() => insertMarkdown('\n> ', '\n')} />
                  <div className="mx-1 h-5 w-px bg-white/10" />
                  <ToolbarBtn icon={Link2} label="Link" onClick={() => insertMarkdown('[', '](url)')} />
                  <ToolbarBtn icon={ImageIcon} label="Image" onClick={() => insertMarkdown('![alt](', ')')} />
                </div>

                {/* Content editor */}
                <Textarea
                  id="article-content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Start writing your article...&#10;&#10;Share your perspective on a music topic, review an album, cover a live event, interview an artist, or tell a story from the scene.&#10;&#10;Use the toolbar above for formatting. Your article will be shared with your followers and, if it gets traction, featured on News Pulse."
                  className="min-h-[420px] resize-y border-white/10 bg-white/[0.02] text-base leading-relaxed text-white placeholder:text-slate-600 focus-visible:border-fuchsia-500/30 focus-visible:ring-fuchsia-500/10"
                />

                {/* Word count bar */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{wordCount} words &middot; {content.length} characters</span>
                  <span>~{readingTime} min read</span>
                </div>
              </>
            )}
          </div>

          {/* Sidebar — right 1/3 */}
          <div className="space-y-5">
            {/* Featured Image */}
            <Card className="border-white/10 bg-white/[0.04]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-white">
                  <ImageIcon className="h-4 w-4 text-fuchsia-400" />
                  Cover Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={featuredImageUrl}
                  onChange={e => setFeaturedImageUrl(e.target.value)}
                  placeholder="Paste an image URL..."
                  className="border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-600"
                />
                {featuredImageUrl && (
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={featuredImageUrl}
                      alt="Cover preview"
                      className="h-36 w-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category */}
            <Card className="border-white/10 bg-white/[0.04]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-fuchsia-500/20 text-fuchsia-300 ring-1 ring-fuchsia-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-white/10 bg-white/[0.04]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-white">
                  <Tag className="h-4 w-4 text-purple-400" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag() }
                    }}
                    placeholder="Add a tag..."
                    className="border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs text-slate-400 hover:text-white"
                    onClick={addTag}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-medium text-purple-300"
                      >
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-600">Up to 10 tags. Press Enter to add.</p>
              </CardContent>
            </Card>

            {/* Publishing info */}
            <Card className="border-white/10 bg-white/[0.04]">
              <CardContent className="p-4 text-xs leading-relaxed text-slate-500">
                <p className="mb-2 font-medium text-slate-300">How articles work</p>
                <ul className="space-y-1.5">
                  <li>Your article appears in your followers' feeds immediately.</li>
                  <li>Articles that gain traction (likes, shares, comments) are promoted into News Pulse.</li>
                  <li>All published articles are accessible at <span className="text-fuchsia-400">/blog/your-slug</span>.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
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
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center text-xs text-slate-400">
        Preview Mode
      </div>

      {featuredImageUrl && (
        <div className="overflow-hidden rounded-2xl">
          <img src={featuredImageUrl} alt="" className="h-64 w-full object-cover" />
        </div>
      )}

      <div className="space-y-1">
        <span className="text-xs font-medium text-fuchsia-400">{category}</span>
        <h1 className="text-3xl font-bold text-white md:text-4xl">{title || 'Untitled Article'}</h1>
      </div>

      {excerpt && <p className="text-base text-slate-300">{excerpt}</p>}

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{wordCount} words</span>
        <span>{readingTime} min read</span>
      </div>

      <div className="space-y-4 border-t border-white/10 pt-6">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-relaxed text-slate-300">
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
