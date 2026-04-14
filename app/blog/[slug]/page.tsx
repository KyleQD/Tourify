import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Clock, Tag, User, Eye, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url?: string
  published_at: string
  created_at: string
  updated_at: string
  stats: {
    views: number
    likes: number
    comments: number
    shares: number
  }
  tags: string[]
  categories: string[]
  author: {
    id: string
    name: string
    username: string
    avatar_url?: string
    is_verified: boolean
  }
}

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('artist_blog_posts')
    .select(`
      id,
      title,
      slug,
      content,
      excerpt,
      featured_image_url,
      published_at,
      created_at,
      updated_at,
      stats,
      tags,
      categories,
      user_id,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url,
        is_verified
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) {
    return null
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  const authorName = profile?.full_name || profile?.username || 'Community Author'
  const authorUsername = profile?.username || 'user'
  const authorAvatar = profile?.avatar_url || undefined
  const isVerified = profile?.is_verified || false

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt,
    featured_image_url: data.featured_image_url,
    published_at: data.published_at || data.created_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    stats: data.stats || { views: 0, likes: 0, comments: 0, shares: 0 },
    tags: data.tags || [],
    categories: data.categories || [],
    author: {
      id: data.user_id,
      name: authorName,
      username: authorUsername,
      avatar_url: authorAvatar,
      is_verified: isVerified
    }
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const blogPost = await getBlogPost(slug)

  if (!blogPost) {
    notFound()
  }

  const readingTime = Math.ceil((blogPost.content.length) / 200) // Rough estimate: 200 chars per minute
  const publishedDate = format(new Date(blogPost.published_at), 'MMMM d, yyyy')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link 
          href="/feed" 
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>

        {/* Blog Post Header */}
        <article className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Featured Image */}
          {blogPost.featured_image_url && (
            <div className="relative h-64 md:h-80 w-full">
              <Image
                src={blogPost.featured_image_url}
                alt={blogPost.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
            </div>
          )}

          {/* Post Header Content */}
          <div className="p-6 md:p-8">
            {/* Tags */}
            {blogPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {blogPost.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {blogPost.title}
            </h1>

            {/* Excerpt */}
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              {blogPost.excerpt}
            </p>

            {/* Author and Meta Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {blogPost.author.avatar_url ? (
                    <Image
                      src={blogPost.author.avatar_url}
                      alt={blogPost.author.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                      {blogPost.author.name.charAt(0)}
                    </div>
                  )}
                  {blogPost.author.is_verified && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{blogPost.author.name}</p>
                  <p className="text-slate-400 text-sm">@{blogPost.author.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{readingTime} min read</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{blogPost.stats.views.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center justify-between py-4 border-t border-slate-700/50">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <Heart className="w-5 h-5" />
                  <span>{blogPost.stats.likes.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MessageCircle className="w-5 h-5" />
                  <span>{blogPost.stats.comments.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Share2 className="w-5 h-5" />
                  <span>{blogPost.stats.shares.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-purple-400 transition-colors">
                  <Bookmark className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-purple-400 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Published Date */}
            <div className="text-slate-500 text-sm">
              Published on {publishedDate}
            </div>
          </div>
        </article>

        {/* Blog Content */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 md:p-8">
          <div className="prose prose-invert prose-purple max-w-none">
            <div 
              className="text-slate-300 leading-relaxed text-lg"
              dangerouslySetInnerHTML={{ 
                __html: blogPost.content
                  .split('\n\n')
                  .map(paragraph => `<p class="mb-6">${paragraph}</p>`)
                  .join('')
              }}
            />
          </div>
        </div>

        {/* Tags and Categories */}
        {(blogPost.tags.length > 0 || blogPost.categories.length > 0) && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <div className="flex flex-wrap gap-4">
              {blogPost.categories.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {blogPost.categories.map((category) => (
                      <span
                        key={category}
                        className="px-3 py-1 bg-blue-600/20 text-blue-300 text-sm rounded-full border border-blue-500/30"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {blogPost.tags.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {blogPost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full border border-purple-500/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Author Profile */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-4">
            {blogPost.author.avatar_url ? (
              <Image
                src={blogPost.author.avatar_url}
                alt={blogPost.author.name}
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-600 text-2xl font-bold text-white">
                {blogPost.author.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-white font-semibold text-lg">{blogPost.author.name}</h3>
                {blogPost.author.is_verified && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-slate-400">@{blogPost.author.username}</p>
              <Link 
                href={`/profile/${blogPost.author.username}`}
                className="inline-block mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 