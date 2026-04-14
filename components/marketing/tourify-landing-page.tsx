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

      {/* Header */}
      <header className="relative z-20 border-b border-white/[0.06] bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="Tourify home">
            <TourifyLogo variant="white" size="lg" className="h-9 w-auto drop-shadow-lg" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
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
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
          {/* Top row — logo + auth portal */}
          <div id="get-started" className="grid scroll-mt-20 items-start gap-8 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] lg:gap-12">
            <div className="flex flex-col justify-center gap-8 lg:gap-10">
              <TourifyLogo variant="white" size="xl" className="!h-auto w-full max-w-[32rem] drop-shadow-xl" />
              <div className="relative max-w-md lg:max-w-lg">
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-6 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-7"
                  aria-labelledby="hero-beta-heading"
                >
                  <div
                    className="pointer-events-none absolute -right-24 -top-24 h-44 w-44 rounded-full bg-purple-500/25 blur-3xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-20 -left-20 h-36 w-36 rounded-full bg-cyan-500/15 blur-3xl"
                    aria-hidden
                  />

                  <div className="relative flex flex-col gap-5">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-400/30 bg-purple-950/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-100/95 shadow-inner shadow-purple-950/40">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                      Open beta
                    </div>

                    <div className="space-y-3">
                      <h2
                        id="hero-beta-heading"
                        className="text-balance text-2xl font-bold leading-tight tracking-tight text-white sm:text-[1.65rem] sm:leading-snug lg:text-3xl lg:leading-tight"
                      >
                        Join the open beta with{" "}
                        <span className="bg-gradient-to-r from-purple-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                          free early access
                        </span>
                      </h2>
                      <p className="text-pretty text-[15px] leading-relaxed text-slate-200/95 sm:text-base sm:leading-relaxed">
                        Create your account to try Tourify before general release.{" "}
                        <span className="font-medium text-white">No credit card</span>
                        {" — "}full product access while we ship new features every week.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:flex-wrap sm:items-stretch">
                      <a
                        href="#get-started"
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-purple-950/50 transition hover:border-white/40 hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:flex-none sm:justify-center"
                      >
                        Sign up free
                        <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      </a>
                      <a
                        href={BETA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-center text-sm font-medium text-slate-100 transition hover:border-white/22 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:flex-none sm:justify-center"
                      >
                        Explore the demo
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-200" aria-hidden />
                      </a>
                    </div>

                    <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-slate-400">
                      Prefer the form? Use{" "}
                      <span className="font-medium text-slate-300">Create your free account</span> on the right — same
                      signup, zero friction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full">
              <LandingHeroWithAuth />
            </div>
          </div>

          {/* Copy + CTA below */}
          <div className="mx-auto mt-12 max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              The future of{" "}
              <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                live events
              </span>{" "}
              starts here
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-pretty text-lg leading-relaxed text-slate-300">
              Tourify connects artists, venues, and fans on one intelligent platform.
              Discover, book, and promote — powered by AI matching and real-time&nbsp;signal.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="gap-2 bg-white text-slate-950 shadow-xl shadow-white/10 hover:bg-slate-100"
              >
                <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4" aria-hidden />
                  Try the Beta Today
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                <a href="#features">See how it works</a>
              </Button>
            </div>
          </div>

          {/* Account type features */}
          <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
            {accountTypeFeatures.map(({ title, icon: Icon, color, items }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 backdrop-blur-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Icon className={`h-4.5 w-4.5 ${
                    color === "purple" ? "text-purple-300" : color === "fuchsia" ? "text-fuchsia-300" : "text-cyan-300"
                  }`} aria-hidden />
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                </div>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[13px] leading-snug text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/70" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-white/[0.06] bg-slate-950/50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">What&apos;s included</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Tools that actually make a difference
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Everything you need to discover, book, promote, and manage live events — all in one place.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ title, body, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/5"
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

        {/* Beta banner */}
        <section className="relative overflow-hidden border-y border-white/[0.06]">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-fuchsia-600/10 to-blue-600/10" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              <Sparkles className="h-3 w-3" aria-hidden />
              Now in open beta
            </div>
            <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">
              Your next show starts&nbsp;here
            </h2>
            <p className="max-w-xl text-slate-400">
              Create your free account in under a minute. Set up your profile, explore
              venues and artists, and start booking&nbsp;today.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-2 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-blue-700"
            >
              <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                Try the Beta
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          </div>
        </section>

        {/* Audiences */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Built for everyone in live&nbsp;music</h2>
              <p className="mt-4 text-base text-slate-400">
                Whether you&apos;re on stage, behind the venue, or in the crowd — Tourify gives you superpowers.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
              {accountTypeFeatures.map(({ title, icon: Icon, color, items }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
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

        {/* Final CTA */}
        <section className="border-t border-white/[0.06] bg-slate-950/50 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to transform your live music&nbsp;workflow?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Join thousands of artists, venues, and industry professionals already using Tourify
              to discover, book, and promote.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="gap-2 bg-white text-slate-950 shadow-xl shadow-white/10 hover:bg-slate-100"
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
                className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
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
        <footer className="border-t border-white/[0.06] bg-slate-950/80 py-10 backdrop-blur-md">
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
