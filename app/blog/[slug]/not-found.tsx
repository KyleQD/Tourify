import Link from 'next/link'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function BlogArticleNotFound() {
  return (
    <main className="min-h-screen bg-[#03030a] px-4 pb-24 pt-[calc(3.5rem+2rem)] text-white md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <Link
          href="/news"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-fuchsia-300/40 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          News / Stories
        </Link>

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 bg-black/20 p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
              <BookOpen className="h-3.5 w-3.5" />
              Article
            </div>
          </div>

          <div className="space-y-6 p-6 md:p-10">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
                This story is not available
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                The article may still be a draft, may have been unpublished, or the link may no longer point to a published News story.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full bg-white px-5 text-black hover:bg-white/90">
                <Link href="/news">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Return to News
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/10 bg-white/5 px-5 text-slate-200 hover:bg-white/10"
              >
                <Link href="/community">
                  <Search className="mr-2 h-4 w-4" />
                  Browse the community feed
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
