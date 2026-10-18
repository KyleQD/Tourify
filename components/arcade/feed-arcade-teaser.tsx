import Link from 'next/link'
import { ArrowRight, Disc3, Gamepad2, Sparkles } from 'lucide-react'

export function FeedArcadeTeaser() {
  return (
    <section aria-label="Tourify Arcade" className="relative isolate overflow-hidden rounded-[26px] border border-fuchsia-400/20 bg-gradient-to-br from-[#2b1550] via-[#1c1640] to-[#10284d] p-4 text-white sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-200"><Sparkles className="h-3.5 w-3.5" /> Your feed has games now</div>
          <h3 className="mt-1 text-xl font-black tracking-tight">Take an arcade break 🎮</h3>
          <p className="mt-1 text-xs text-white/65">Two quick side quests. No coins required.</p>
        </div>
        <Link href="/arcade" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-bold hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          All games <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/arcade/beat-deck" className="group rounded-[20px] border border-pink-300/20 bg-pink-400/10 p-3 transition-colors hover:bg-pink-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <Disc3 className="mb-3 h-7 w-7 text-pink-200 transition-transform motion-safe:group-hover:rotate-12" />
          <span className="block text-sm font-black">Beat Deck</span>
          <span className="block text-[11px] text-white/65">Rhythm showdown</span>
        </Link>
        <Link href="/arcade/dj-quest" className="group rounded-[20px] border border-amber-300/20 bg-amber-400/10 p-3 transition-colors hover:bg-amber-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <Gamepad2 className="mb-3 h-7 w-7 text-amber-200" />
          <span className="block text-sm font-black">DJ Odyssey</span>
          <span className="block text-[11px] text-white/65">Road to Studio 54</span>
        </Link>
      </div>
    </section>
  )
}
