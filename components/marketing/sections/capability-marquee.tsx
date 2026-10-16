import { accents } from "@/lib/marketing/accent"
import { features } from "@/lib/marketing/features"
import { cn } from "@/lib/utils"

export function CapabilityMarquee() {
  const items = [...features, ...features]
  return (
    <section aria-label="Platform capabilities" className="border-y border-white/[0.06] bg-slate-950/40 py-5">
      <div
        className="mkt-marquee-wrap relative overflow-hidden"
        style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}
      >
        <ul className="mkt-marquee flex w-max gap-4">
          {items.map((f, i) => (
            <li
              key={`${f.slug}-${i}`}
              aria-hidden={i >= features.length}
              className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-slate-300"
            >
              <f.icon className={cn("h-4 w-4", accents[f.accent].text)} aria-hidden />
              {f.title}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
