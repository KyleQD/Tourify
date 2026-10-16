import Link from "next/link"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { Reveal } from "@/components/marketing/motion/reveal"
import { accents } from "@/lib/marketing/accent"
import { features } from "@/lib/marketing/features"
import { personas } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

const reverse = "[animation-direction:reverse]"

function Ring({
  items,
  radius,
  reversed,
  duration,
}: {
  items: { key: string; href: string; label: string; icon: React.ComponentType<{ className?: string }>; text: string; border: string }[]
  radius: number
  reversed?: boolean
  duration: string
}) {
  return (
    <div
      className={cn("mkt-orbit-spin absolute inset-0 m-auto rounded-full border border-dashed border-white/10", reversed && reverse)}
      style={{ width: radius * 2, height: radius * 2, animationDuration: duration }}
    >
      {items.map((item, i) => {
        const angle = (360 / items.length) * i
        return (
          <div
            key={item.key}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)` }}
          >
            <div
              className={cn("mkt-orbit-counter -translate-x-1/2 -translate-y-1/2", reversed && reverse)}
              style={{ animationDuration: duration }}
            >
              <Link
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950 shadow-lg transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:h-12 sm:w-12",
                  item.border,
                )}
              >
                <item.icon className={cn("h-5 w-5", item.text)} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function EcosystemOrbit() {
  const inner = features.slice(0, 6).map((f) => ({
    key: f.slug,
    href: `/features/${f.slug}`,
    label: f.title,
    icon: f.icon,
    text: accents[f.accent].text,
    border: accents[f.accent].border,
  }))
  const outer = personas.map((p) => ({
    key: p.slug,
    href: `/solutions/${p.slug}`,
    label: p.name,
    icon: p.icon,
    text: accents[p.accent].text,
    border: accents[p.accent].border,
  }))

  return (
    <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The ecosystem"
          title={
            <>
              Every role, one <GradientText>connected network</GradientText>
            </>
          }
          description="Artists, venues, crews and fans work from the same shared data. Select any node to learn more."
        />
        <Reveal className="mt-14">
          <div className="relative mx-auto flex aspect-square w-full max-w-[34rem] items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-600/10 blur-3xl" aria-hidden />
            <Ring items={outer} radius={232} reversed duration="90s" />
            <Ring items={inner} radius={140} duration="60s" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-purple-400/40 bg-gradient-to-br from-purple-600 to-blue-600 text-center text-sm font-bold shadow-[0_0_60px_-10px_rgba(168,85,247,0.8)]">
              Tourify
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Outer ring: user types. Inner ring: core features.</p>
        </Reveal>
      </div>
    </section>
  )
}
