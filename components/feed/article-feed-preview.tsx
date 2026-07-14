'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, BookOpen, Clock3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'

export interface ArticlePreviewData {
  id: string
  slug: string
  url: string | null
  title: string
  excerpt: string
  featuredImageUrl: string | null
  categories: string[]
  tags: string[]
  readingTime: number
  publishedAt: string | null
}

interface ArticleFeedPreviewProps {
  article: ArticlePreviewData
  compact?: boolean
}

function articleHref(article: ArticlePreviewData) {
  return article.url || (article.slug ? `/blog/${article.slug}` : '#')
}

function ArticleLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={className} aria-label="Read full article">
      {children}
    </Link>
  )
}

export function ArticleFeedPreview({ article, compact = false }: ArticleFeedPreviewProps) {
  const href = articleHref(article)
  const category = article.categories?.[0] || 'Article'
  const publishedLabel = article.publishedAt
    ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })
    : null

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/20">
      {article.featuredImageUrl ? (
        <ArticleLink href={href} className="group relative block aspect-[16/9] overflow-hidden bg-slate-950">
          <img
            src={article.featuredImageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              <BookOpen className="h-3 w-3" />
              Article
            </span>
            <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-500/25 px-2.5 py-1 text-xs font-medium text-fuchsia-100 backdrop-blur">
              {category}
            </span>
          </div>
        </ArticleLink>
      ) : null}

      <div className={compact ? 'space-y-3 p-4' : 'space-y-4 p-5'}>
        {!article.featuredImageUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <BookOpen className="h-3 w-3" />
              Article
            </span>
            <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/15 px-2.5 py-1 text-xs font-medium text-fuchsia-100">
              {category}
            </span>
          </div>
        ) : null}

        <div className="space-y-2">
          <ArticleLink href={href} className="group block">
            <h3 className={`${compact ? 'text-base' : 'text-lg'} line-clamp-2 font-semibold leading-snug text-white transition group-hover:text-fuchsia-100`}>
              {article.title}
            </h3>
          </ArticleLink>
          {article.excerpt ? (
            <ArticleLink href={href} className="block">
              <p className={`${compact ? 'text-xs leading-5' : 'text-sm leading-6'} line-clamp-3 text-slate-300 transition hover:text-slate-100`}>
                {article.excerpt}
              </p>
            </ArticleLink>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {article.readingTime || 1} min read
            </span>
            {publishedLabel ? <span>{publishedLabel}</span> : null}
          </div>
          <Button asChild size="sm" className="w-full rounded-full bg-white text-black hover:bg-white/90 sm:w-auto">
            <Link href={href}>
              Read article
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
