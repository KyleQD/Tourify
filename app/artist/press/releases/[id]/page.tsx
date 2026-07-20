'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Download, Loader2, Share2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useActingContext } from '@/hooks/use-acting-context'
import { PressReleaseShareDialog } from '@/components/press/press-release-share-dialog'
import { ARTIST_PRIMARY_BTN, ARTIST_OUTLINE_BTN, ARTIST_CARD } from '@/components/dashboard/artist-tokens'
import { cn } from '@/lib/utils'

interface PressReleaseView {
  id: string
  title: string
  content: string
  excerpt: string | null
  subtitle: string | null
  boilerplate: string | null
  embargo_until: string | null
  published_at: string | null
  account_display_name: string | null
  account_username: string | null
  isOwner: boolean
  pdfUrl: string
}

export default function PressReleaseReaderPage() {
  const params = useParams()
  const id = params?.id as string
  const { actingHeaders, isActingReady } = useActingContext()
  const [release, setRelease] = useState<PressReleaseView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRelease = useCallback(async () => {
    if (!id || !isActingReady) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/press/releases/${id}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
      })
      const data = await response.json()
      if (!response.ok || !data.success)
        throw new Error(data.error || 'Unable to load press release')

      setRelease(data.release)
    } catch (err) {
      setRelease(null)
      setError(err instanceof Error ? err.message : 'Unable to load press release')
    } finally {
      setIsLoading(false)
    }
  }, [id, isActingReady, actingHeaders])

  useEffect(() => {
    loadRelease()
  }, [loadRelease])

  async function handleDownload() {
    if (!release) return
    setIsDownloading(true)
    try {
      const response = await fetch(release.pdfUrl, {
        credentials: 'include',
        headers: { ...actingHeaders },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to download PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${release.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'press-release'}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading || !isActingReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        <span className="sr-only">Loading press release</span>
      </div>
    )
  }

  if (error || !release) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <p className="text-slate-300">{error || 'Press release not found'}</p>
        <Button asChild variant="outline" className={ARTIST_OUTLINE_BTN}>
          <Link href="/artist/press">Back to Press</Link>
        </Button>
      </div>
    )
  }

  const isEmbargoed =
    release.embargo_until && new Date(release.embargo_until).getTime() > Date.now()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
          <Link href="/artist/press">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Press
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {release.isOwner ? (
            <Button variant="outline" className={ARTIST_OUTLINE_BTN} onClick={() => setShowShare(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          ) : null}
          <Button className={ARTIST_PRIMARY_BTN} onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <article className={cn(ARTIST_CARD, 'space-y-4 p-6')}>
        <p className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
          {isEmbargoed
            ? `Embargoed until ${new Date(release.embargo_until!).toLocaleString()}`
            : 'For immediate release'}
        </p>
        <h1 className="text-3xl font-bold text-white">{release.title}</h1>
        {release.subtitle ? <p className="text-lg text-slate-300">{release.subtitle}</p> : null}
        <p className="text-sm text-slate-500">
          {release.account_display_name || release.account_username || 'Artist'}
          {release.published_at
            ? ` · ${new Date(release.published_at).toLocaleDateString()}`
            : null}
        </p>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-200">
          {release.content}
        </div>
        {release.boilerplate ? (
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Media contact / boilerplate
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-300">{release.boilerplate}</p>
          </div>
        ) : null}
      </article>

      {showShare ? (
        <PressReleaseShareDialog
          pressPostId={release.id}
          title={release.title}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </div>
  )
}
