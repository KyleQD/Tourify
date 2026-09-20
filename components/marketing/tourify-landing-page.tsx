import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Mic2,
  Play,
  Sparkles,
  Ticket,
  ClipboardList,
  Users,
  BarChart3,
} from "lucide-react"
import { TourifyLogo } from "@/components/tourify-logo"
import { Button } from "@/components/ui/button"
import { LandingHeroWithAuth } from "@/components/marketing/landing-hero-auth"

const BETA_URL = "https://demo.tourify.live"

const features = [
  {
    title: "Event creation & ticketing",
    body: "Build events, sell tickets, and manage capacity from a single dashboard — no third-party tools required.",
    icon: Ticket,
  },
  {
    title: "Tour routing & calendar",
    body: "Plan multi-city runs, visualize your route on a map, and keep every date organized in one calendar.",
    icon: Calendar,
  },
  {
    title: "Staff scheduling & onboarding",
    body: "Invite team members, assign shifts, track availability, and onboard new hires with guided workflows.",
    icon: ClipboardList,
  },
  {
    title: "Built-in messaging",
    body: "Direct messages, group threads, and booking conversations — all in one place so nothing gets lost.",
    icon: MessageSquare,
  },
  {
    title: "Artist & venue profiles",
    body: "Showcase your work with rich profiles, EPKs, photo galleries, and embedded music or video.",
    icon: Users,
  },
  {
    title: "Analytics & reporting",
    body: "Track event performance, audience growth, revenue, and engagement with clear visual dashboards.",
    icon: BarChart3,
  },
] as const

const accountTypeFeatures = [
  {
    title: "For Artists",
    icon: Mic2,
    color: "purple",
    items: [
      "EPK builder & public profile",
      "Tour routing & event calendar",
      "AI-powered venue matching",
      "Merch & music storefront",
      "Fan engagement analytics",
      "Contract & rider management",
    ],
  },
  {
    title: "For Venues",
    icon: Building2,
    color: "fuchsia",
    items: [
      "Staff scheduling & onboarding",
      "Event creation & ticketing",
      "Equipment & asset tracking",
      "Real-time team messaging",
      "Booking request management",
      "Financial reporting dashboard",
    ],
  },
  {
    title: "For Fans & Industry",
    icon: Users,
    color: "cyan",
    items: [
      "Discover local shows & artists",
      "Social feed & community posts",
      "Follow artists & venues",
      "Job board & opportunities",
      "Networking & collaboration",
      "Event recommendations",
    ],
  },
] as const

export function TourifyLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-950 text-white">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        Skip to main content
      </a>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-[0.04]" />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-slate-950/90 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/75">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:h-16 sm:px-6 sm:py-0 lg:px-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="Tourify home">
            <TourifyLogo variant="white" size="lg" className="h-8 w-auto drop-shadow-lg sm:h-9" />
          </Link>
          <nav className="hidden items-center gap-2 md:flex lg:gap-3" aria-label="Primary">
            <Button
              asChild
              variant="ghost"
              className="gap-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                <Play className="h-3.5 w-3.5" aria-hidden />
                Try the Beta
              </a>
            </Button>
            <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">
              <a href="#features">Features</a>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-blue-700"
            >
              <a href="#get-started">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </a>
            </Button>
          </nav>
          <nav className="flex items-center gap-1.5 md:hidden" aria-label="Mobile primary">
            <Button
              asChild
              variant="ghost"
              className="min-h-11 px-3 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Link href="/login?tab=signin">Sign in</Link>
            </Button>
            <Button
              asChild
              className="min-h-11 bg-gradient-to-r from-purple-600 to-blue-600 px-3.5 shadow-lg shadow-purple-500/20"
            >
              <a href="#signup">Join free</a>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        <section id="get-started" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8 lg:pt-16">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="mx-auto max-w-2xl text-center lg:sticky lg:top-28 lg:mx-0 lg:pt-4 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-950/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-100 shadow-inner shadow-purple-950/40">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                Free access during open beta
              </div>
              <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl">
                Run your live music world from{" "}
                <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  one place
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0">
                Create events, book talent, coordinate teams, sell tickets, and grow your audience without stitching together five different tools.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 w-full gap-2 bg-white text-slate-950 shadow-xl shadow-white/10 hover:bg-slate-100 sm:w-auto"
                >
                  <a href="#signup">
                    Create your free account
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 w-full gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                >
                  <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                    Explore the demo
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
              </div>

              <ul className="mt-7 grid gap-2.5 text-left text-sm text-slate-300 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" aria-label="Beta benefits">
                {["No credit card", "Every account type", "Setup in minutes"].map((benefit) => (
                  <li key={benefit} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    {benefit}
                  </li>
                ))}
              </ul>

              <a href="#features" className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-purple-200 underline-offset-4 hover:text-white hover:underline lg:mt-8">
                See what&apos;s included
              </a>
            </div>

            <div id="signup" className="w-full scroll-mt-24">
              <LandingHeroWithAuth />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-white/[0.06] bg-slate-950/50 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">What&apos;s included</p>
              <h2 className="mt-3 text-balance text-2xl font-bold text-white sm:text-4xl">
                Tools that actually make a difference
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Everything you need to discover, book, promote, and manage live events — all in one place.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {features.map(({ title, body, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/5 sm:p-6"
                >
                  <div className="mb-4 inline-flex rounded-xl border border-purple-400/20 bg-purple-500/10 p-2.5 text-purple-200 transition-colors group-hover:bg-purple-500/20">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-2xl font-bold text-white sm:text-4xl">Built for everyone in live music</h2>
              <p className="mt-4 text-base text-slate-400">
                Whether you&apos;re on stage, behind the venue, or in the crowd — Tourify gives you superpowers.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 md:grid-cols-3 md:gap-6">
              {accountTypeFeatures.map(({ title, icon: Icon, color, items }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
                >
                  <Icon className={`mb-3 h-6 w-6 ${
                    color === "purple" ? "text-purple-300" : color === "fuchsia" ? "text-fuchsia-300" : "text-cyan-300"
                  }`} aria-hidden />
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm leading-snug text-slate-400">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/70" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-blue-700"
              >
                <a href="#get-started">
                  Create your free account
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06] bg-slate-950/50 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-balance text-2xl font-bold text-white sm:text-4xl">
              Ready to simplify your live music workflow?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Join thousands of artists, venues, and industry professionals already using Tourify
              to discover, book, and promote.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                size="lg"
                className="min-h-12 gap-2 bg-white text-slate-950 shadow-xl shadow-white/10 hover:bg-slate-100"
              >
                <a href="#get-started">
                  Sign up free
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-12 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4" aria-hidden />
                  Try the Beta Today
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-slate-950/80 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center text-sm text-slate-500 sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <TourifyLogo variant="white" size="md" className="h-8 w-auto opacity-80" />
              <p>&copy; {new Date().getFullYear()} Tourify. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <a
                href={BETA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 underline-offset-4 hover:text-white hover:underline"
              >
                Beta
              </a>
              <Link href="/terms" className="text-slate-400 underline-offset-4 hover:text-white hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="text-slate-400 underline-offset-4 hover:text-white hover:underline">
                Privacy
              </Link>
              <a href="#get-started" className="font-medium text-purple-300 hover:text-white">
                Sign up
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
