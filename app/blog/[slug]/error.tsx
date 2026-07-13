'use client'

import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function BlogArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#03030a] pb-24 pt-[calc(3.5rem+1rem)] text-white">
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-10">
          <h1 className="text-2xl font-semibold text-white">We couldn&apos;t load this article</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
            The post may still be publishing, the link may be stale, or the page hit a loading error.
            Try refreshing once before heading back to News.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              type="button"
              className="rounded-xl bg-white text-black hover:bg-white/90"
              onClick={reset}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10">
              <a href="/news">Back to News</a>
            </Button>
          </div>
          <p className="mt-6 text-xs text-slate-600">{error.message}</p>
        </div>
      </div>
    </div>
  )
}
