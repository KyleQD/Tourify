import { paCard, paHeroAspect, paHeroFrame, paShell } from "@/components/public-artist/public-artist-ui"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
      <section className="w-full">
        <div className={`${paShell} pt-4 pb-2 sm:pb-4`}>
          <div className={paHeroFrame}>
            <div className={`${paHeroAspect} bg-gradient-to-br from-purple-950/80 via-black to-slate-950`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 items-end gap-4">
                    <div className="h-24 w-24 shrink-0 animate-pulse rounded-full border-2 border-white/20 bg-white/10 sm:h-28 sm:w-28" />
                    <div className="min-w-0 space-y-2 pb-0.5">
                      <div className="h-8 max-w-[12rem] animate-pulse rounded-full bg-white/15 sm:h-9" />
                      <div className="h-4 max-w-[16rem] animate-pulse rounded-full bg-white/10" />
                      <div className="flex gap-2 pt-1">
                        <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
                        <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <div className="h-10 w-24 animate-pulse rounded-full bg-white/15" />
                    <div className="h-10 w-24 animate-pulse rounded-full bg-white/15" />
                    <div className="h-10 w-28 animate-pulse rounded-full bg-white/15" />
                    <div className="h-10 w-32 animate-pulse rounded-full bg-white/15" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className={`${paShell} space-y-8 pb-28 pt-2 sm:pt-4`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${paCard} p-6`}>
            <div className="mb-4 h-5 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
