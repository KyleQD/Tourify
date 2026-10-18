'use client'

import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Disc3, Globe2, Sparkles, Users } from 'lucide-react'

const destinations = [
  { href: '/music', label: 'Find your sound', icon: Disc3 },
  { href: '/events', label: 'Explore events', icon: CalendarDays },
  { href: '/discover/users', label: 'Meet your people', icon: Users },
  { href: '/discover', label: 'Explore the world', icon: Globe2 },
] as const

export function FeedSceneHeader() {
  return (
    <section aria-labelledby="scene-heading" className="relative isolate overflow-hidden rounded-[28px] border border-fuchsia-400/20 bg-[#110d24] px-5 py-6 text-white shadow-[0_24px_90px_rgba(77,24,126,0.18)] sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(236,72,153,0.3),transparent_38%),radial-gradient(circle_at_90%_80%,rgba(56,189,248,0.23),transparent_45%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-8 h-44 w-44 rounded-full border-[26px] border-purple-500/20 shadow-[0_0_80px_rgba(192,132,252,0.25)] motion-safe:animate-pulse" />
      <div aria-hidden="true" className="pointer-events-none absolute right-11 top-7 h-16 w-16 rounded-full border-[10px] border-fuchsia-400/20" />

      <div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-300">
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        Welcome to your scene
      </div>
      <h2 id="scene-heading" className="relative mt-3 max-w-md text-3xl font-black leading-[1.06] tracking-tight sm:text-[2.5rem]">
        More music. <span className="bg-gradient-to-r from-pink-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">More moments.</span> More you.
      </h2>
      <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-white/70">
        Catch up with your community, hear something new, and find your next unforgettable night.
      </p>
      <nav aria-label="Feed discovery shortcuts" className="relative mt-6 grid grid-cols-2 gap-2">
        {destinations.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[54px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3 text-left text-xs font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 motion-reduce:transform-none"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-fuchsia-200">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">{label}</span>
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-white/50 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </nav>
    </section>
  )
}
