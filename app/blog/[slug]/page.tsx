import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Clock3, Eye, ShieldCheck, Tag } from 'lucide-react'

import { ArticleActionBar } from '@/components/blog/article-action-bar'
import { Button } from '@/components/ui/button'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getMoreFromAuthor, getPublicArticleBySlug, type PublicArticle } from '@/lib/blog/public-articles'

// getBlogAccountAuthor is applied inside the shared article read helpers, which
// normalize account_display_name and posted_as_type from the stored article row.

export const dynamic = 'force-dynamic'

const SITE_NAME = 'Tourify News'
const DEFAULT_SITE_ORIGIN = 'https://tourify.live'

function getSiteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN).replace(/\/$/, '')
}

function toAbsoluteUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value, `${getSiteOrigin()}/`).toString()
  } catch {
    return null
  }
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getArticleDescription(article: PublicArticle) {
  const source = article.excerpt || stripMarkdown(article.content)
  const cleaned = stripMarkdown(source)
  if (cleaned.length <= 160) return cleaned
  return `${cleaned.slice(0, 157).trim()}...`
}

function getArticleKeywords(article: PublicArticle) {
  return Array.from(new Set([
    ...article.categories,
    ...article.tags,
    article.author.name,
    'Tourify News',
    'music news',
    'live entertainment',
  ].map(keyword => keyword.trim()).filter(Boolean)))
}

function getArticleWordCount(article: PublicArticle) {
  return stripMarkdown(article.content).split(/\s+/).filter(Boolean).length
}

function getArticleJsonLd(article: PublicArticle) {
  const canonicalUrl = toAbsoluteUrl(`/blog/${article.slug}`) || `${getSiteOrigin()}/blog/${article.slug}`
  const imageUrl = toAbsoluteUrl(article.featuredImageUrl)
  const authorUrl = toAbsoluteUrl(article.author.profilePath)
  const keywords = getArticleKeywords(article)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    headline: article.title,
    description: getArticleDescription(article),
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': article.author.type === 'organization' ? 'Organization' : 'Person',
      name: article.author.name,
      url: authorUrl || undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tourify',
      logo: {
        '@type': 'ImageObject',
        url: `${getSiteOrigin()}/icon`,
      },
    },
    url: canonicalUrl,
    isAccessibleForFree: true,
    articleSection: article.categories,
    keywords: keywords.join(', '),
    wordCount: getArticleWordCount(article),
  }
}

function getBreadcrumbJsonLd(article: PublicArticle) {
  const origin = getSiteOrigin()
  const canonicalUrl = `${origin}/blog/${article.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'News',
        item: `${origin}/news`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Stories',
        item: `${origin}/news`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: canonicalUrl,
      },
    ],
  }
}

function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

function renderArticleContent(content: string) {
  const blocks = content
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)

  return blocks.map((block, index) => {
    if (block.startsWith('### ')) {
      return (
        <h3 key={index} className="text-xl font-semibold text-white">
          {block.replace(/^###\s+/, '')}
        </h3>
      )
    }

    if (block.startsWith('## ')) {
      return (
        <h2 key={index} className="text-2xl font-semibold text-white">
          {block.replace(/^##\s+/, '')}
        </h2>
      )
    }

    if (block.startsWith('> ')) {
      return (
        <blockquote
          key={index}
          className="border-l-2 border-fuchsia-400/60 pl-4 italic text-slate-300"
        >
          {block.replace(/^>\s+/, '')}
        </blockquote>
      )
    }

    const listItems = block
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))

    if (listItems.length > 0 && listItems.length === block.split('\n').filter(Boolean).length) {
      return (
        <ul key={index} className="space-y-2 pl-5 text-slate-200">
          {listItems.map(item => (
            <li key={item} className="list-disc">
              {item.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')}
            </li>
          ))}
        </ul>
      )
    }

    return (
      <p key={index} className="text-base leading-8 text-slate-200 md:text-lg">
        {block}
      </p>
    )
  })
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceRoleClient()
  const article = await getPublicArticleBySlug(supabase, slug)

  if (!article) {
    return {
      title: `Article not found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const description = getArticleDescription(article)
  const canonicalPath = `/blog/${article.slug}`
  const canonicalUrl = toAbsoluteUrl(canonicalPath) || `${getSiteOrigin()}${canonicalPath}`
  const imageUrl = toAbsoluteUrl(article.featuredImageUrl)
  const authorProfileUrl = toAbsoluteUrl(article.author.profilePath)
  const keywords = getArticleKeywords(article)

  return {
    title: `${article.title} | ${SITE_NAME}`,
    description,
    keywords,
    authors: [
      {
        name: article.author.name,
        url: authorProfileUrl || undefined,
      },
    ],
    category: article.categories[0] || 'Music',
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      url: canonicalUrl,
      siteName: 'Tourify',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt || article.publishedAt,
      authors: authorProfileUrl ? [authorProfileUrl] : [article.author.name],
      tags: keywords,
      images: imageUrl ? [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ] : [],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: article.title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const supabase = createServiceRoleClient()
  const article = await getPublicArticleBySlug(supabase, slug)

  if (!article) {
    notFound()
  }

  const moreFromAuthor = await getMoreFromAuthor(supabase, article, 3)
  const articleJsonLd = getArticleJsonLd(article)
  const breadcrumbJsonLd = getBreadcrumbJsonLd(article)

  return (
    <div className="min-h-screen bg-[#03030a] pb-24 pt-[calc(3.5rem+1rem)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-6">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-fuchsia-300/40 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              News / Stories
            </Link>

            <article className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              {article.featuredImageUrl ? (
                <div className="relative h-64 w-full overflow-hidden border-b border-white/10 md:h-96">
                  <Image
                    src={article.featuredImageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03030a] via-[#03030a]/30 to-transparent" />
                </div>
              ) : null}

              <div className="space-y-6 p-6 md:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                    Article
                  </span>
                  {article.categories.slice(0, 2).map(category => (
                    <span
                      key={category}
                      className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200"
                    >
                      {category}
                    </span>
                  ))}
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                    {article.title}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                    {article.excerpt}
                  </p>
                </div>

                <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    {article.author.avatarUrl ? (
                      <Image
                        src={article.author.avatarUrl}
                        alt={article.author.name}
                        width={52}
                        height={52}
                        className="h-[52px] w-[52px] rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
                        {article.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white md:text-base">
                          {article.author.name}
                        </span>
                        {article.author.isVerified ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 md:text-sm">
                        {article.author.profilePath ? (
                          <Link href={article.author.profilePath} className="transition hover:text-white">
                            {article.author.username ? `@${article.author.username}` : 'View profile'}
                          </Link>
                        ) : (
                          <span>{article.author.username ? `@${article.author.username}` : 'Tourify author'}</span>
                        )}
                        <span className="text-slate-600">•</span>
                        <span>{format(new Date(article.publishedAt), 'MMMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {article.readingTime} min read
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {article.metrics.views.toLocaleString()} views
                    </span>
                  </div>
                </div>

                <ArticleActionBar
                  articleTitle={article.title}
                  canonicalPath={`/blog/${article.slug}`}
                  metrics={{
                    likes: article.metrics.likes,
                    comments: article.metrics.comments,
                    shares: article.metrics.shares,
                  }}
                />
              </div>
            </article>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-10">
              <div className="space-y-6">
                {renderArticleContent(article.content)}
              </div>
            </section>

            {(article.tags.length > 0 || article.categories.length > 0) ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                <div className="flex flex-wrap gap-6">
                  {article.categories.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Tag className="h-4 w-4 text-fuchsia-300" />
                        Categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {article.categories.map(category => (
                          <span
                            key={category}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {article.tags.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-white">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="relative z-10 space-y-6">
            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 text-sm font-semibold text-white">About the author</div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {article.author.avatarUrl ? (
                    <Image
                      src={article.author.avatarUrl}
                      alt={article.author.name}
                      width={56}
                      height={56}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
                      {article.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{article.author.name}</p>
                      {article.author.isVerified ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-400">
                      {article.author.username ? `@${article.author.username}` : 'Tourify member'}
                    </p>
                  </div>
                </div>

                {article.author.profilePath ? (
                  <Button asChild className="w-full rounded-xl bg-white text-black hover:bg-white/90">
                    <Link href={article.author.profilePath}>Visit profile</Link>
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 text-sm font-semibold text-white">More from this author</div>
              {moreFromAuthor.length > 0 ? (
                <div className="space-y-3">
                  {moreFromAuthor.map(related => (
                    <Link
                      key={related.id}
                      href={`/blog/${related.slug}`}
                      className="block rounded-2xl border border-white/8 bg-black/20 p-4 transition hover:border-white/15 hover:bg-black/30"
                    >
                      <div className="space-y-2">
                        <p className="line-clamp-2 text-sm font-semibold text-white">{related.title}</p>
                        <p className="line-clamp-2 text-xs leading-5 text-slate-400">{related.excerpt}</p>
                        <div className="text-[11px] text-slate-500">
                          {formatDistanceToNow(new Date(related.publishedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                  More stories from this author will show up here once they publish them.
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
