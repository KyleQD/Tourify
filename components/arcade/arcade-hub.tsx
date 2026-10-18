import Link from 'next/link'
import { ArrowLeft, ArrowRight, Disc3, Gamepad2, Headphones, Keyboard, Music2, Sparkles } from 'lucide-react'

const games = [
  {
    href: '/arcade/beat-deck',
    eyebrow: 'RHYTHM · KEYBOARD / TOUCH',
    title: 'Beat Deck',
    description: 'Perform across three reactive concert stages. Hit notes, build combos, and practice with your own eligible Tourify tracks.',
    icon: Disc3,
    accent: 'from-fuchsia-500/30 via-purple-600/25 to-indigo-900/40',
    tags: ['3 stages', 'Combo crowd', 'Touch + keys'], 
    color: 'text-pink-200',
  },
  {
    href: '/arcade/dj-quest',
    eyebrow: 'PLATFORMER · RETRO / TOUCH',
    title: 'DJ Odyssey',
    description: 'Tour six nightlife destinations—including Ibiza and Santa Barbara’s EOS Lounge—with original coastal and cityscapes, playable landmark maps, vinyl pickups and DJ-booth finales.',
    icon: Gamepad2,
    accent: 'from-amber-400/25 via-rose-500/20 to-fuchsia-900/40',
    tags: ['6 club chapters', 'EOS Santa Barbara', 'Route maps'],  
    color: 'text-amber-200',
  },
] as const

export function ArcadeHub() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12 text-white sm:px-6">
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to your feed</Link>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300"><Sparkles className="h-4 w-4" /> Tourify Arcade · Early access</div>
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Press play. <span className="bg-gradient-to-r from-pink-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">Stay for the encore.</span></h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-300">A little side quest between songs and shows. Two original arcade experiences built for your keyboard or touchscreen.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {games.map(({ href, eyebrow, title, description, icon: Icon, accent, tags, color }) => (
          <Link href={href} key={href} className={'group relative flex min-h-[350px] flex-col justify-between overflow-hidden rounded-[30px] border border-white/15 bg-gradient-to-br p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 motion-reduce:transform-none sm:p-8 ' + accent}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full border-[45px] border-white/[0.08] motion-safe:group-hover:rotate-12" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.15em] text-white/70">{eyebrow}</span>
                <Icon className={'h-12 w-12 ' + color} aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-black sm:text-4xl">{title}</h2>
              <p className="max-w-sm text-sm leading-relaxed text-white/80">{description}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => <span key={tag} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">{tag}</span>)}
              </div>
            </div>
            <div className="relative mt-10 flex items-center justify-between border-t border-white/15 pt-5 font-bold">
              <span className="inline-flex items-center gap-2"><Headphones className="h-4 w-4" /> PLAY NOW</span>
              <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform motion-safe:group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
      <p className="flex items-start gap-2 text-sm text-white/55"><Keyboard className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Keyboard and mobile controls are built in. Personal bests currently live only in your browser; competitive leaderboards, artist game-use opt-in, and more adventures are planned for the next phase.</p>
      <Link href="/music" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10"><Music2 className="h-4 w-4" /> Browse music on Tourify <ArrowRight className="h-4 w-4" /></Link>
    </div>
  )
}
