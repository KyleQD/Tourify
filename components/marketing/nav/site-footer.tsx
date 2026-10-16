import Link from "next/link"
import { TourifyLogo } from "@/components/tourify-logo"
import { StatusBadge } from "@/components/marketing/status-badge"
import { featureStatusMeta, featureStatusOrder } from "@/lib/marketing/feature-status"
import { features } from "@/lib/marketing/features"
import { personas } from "@/lib/marketing/personas"

const BETA_URL = "https://demo.tourify.live"
const linkClass = "text-sm text-slate-400 underline-offset-4 transition-colors hover:text-white hover:underline"

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <TourifyLogo variant="white" size="md" className="h-8 w-auto opacity-90" />
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              One platform for artists, venues, crews and fans to plan, book and experience live events.
            </p>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feature status</p>
              <ul className="flex flex-wrap gap-2">
                {featureStatusOrder.map((s) => (
                  <li key={s} title={featureStatusMeta[s].description}>
                    <StatusBadge status={s} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <nav aria-label="Solutions">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Solutions</p>
            <ul className="space-y-2">
              {personas.map((p) => (
                <li key={p.slug}>
                  <Link href={`/solutions/${p.slug}`} className={linkClass}>
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Features">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Features</p>
            <ul className="space-y-2">
              {features.map((f) => (
                <li key={f.slug}>
                  <Link href={`/features/${f.slug}`} className={linkClass}>
                    {f.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Company</p>
            <ul className="space-y-2">
              <li>
                <a href={BETA_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Try the Beta
                </a>
              </li>
              <li>
                <Link href="/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/#get-started" className={linkClass}>
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/blog" className={linkClass}>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Tourify. All rights reserved.</p>
          <p>Tourify is in open beta. Features and statuses change often.</p>
        </div>
      </div>
    </footer>
  )
}
