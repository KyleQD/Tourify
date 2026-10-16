import type { ReactNode } from "react"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-950 text-white">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        Skip to main content
      </a>
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-[0.04]" />
      </div>
      <SiteHeader />
      <main id="main-content" className="relative z-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
