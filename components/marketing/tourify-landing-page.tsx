import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Building2, Mic2, Radio, Sparkles, Users } from "lucide-react"
import { TourifyLogo } from "@/components/tourify-logo"
import { Button } from "@/components/ui/button"
import { LandingHeroWithAuth } from "@/components/marketing/landing-hero-auth"

const SIGNUP_HREF = "/login?tab=signup"
const SIGNIN_HREF = "/login?tab=signin"
const HOW_IT_WORKS_HREF = "#how-it-works"
const PRIMARY_CTA_LABEL = "Create account"
const SECONDARY_CTA_LABEL = "Sign in"
const primaryCtaClassName =
  "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700"
const secondaryCtaClassName = "border-white/25 bg-white/5 text-white hover:bg-white/10"

const pillars = [
  {
    title: "AI-powered matching",
    body: "Surface venues, artists, and collaborators that fit your sound, capacity, and goals.",
    icon: Sparkles,
  },
  {
    title: "Real-time signal",
    body: "Track momentum across bookings, discovery, and your network in one live workspace.",
    icon: Radio,
  },
  {
    title: "One connected platform",
    body: "Profiles, events, and messaging stay in sync so nothing falls through the cracks.",
    icon: Users,
  },
] as const

const audiences = [
  {
    title: "Artists & performers",
    body: "Promote your work, plan routing, and book rooms that match your draw.",
    icon: Mic2,
  },
  {
    title: "Venues & promoters",
    body: "Fill the calendar, coordinate staff, and keep ticketing and comms aligned.",
    icon: Building2,
  },
  {
    title: "Industry & fans",
    body: "Discover shows, grow reputations, and stay close to the scenes you care about.",
    icon: Users,
  },
] as const

const trustStats = [
  { label: "Cities activated", value: "120+" },
  { label: "Bookings coordinated", value: "9.4k" },
  { label: "Avg. response speed", value: "< 2m" }
] as const

const mediaMoments = [
  {
    title: "Discover matches",
    body: "Introduce cinematic clips or stills of venues and crowds to create immediate destination intent.",
    imageSrc: "/placeholder.jpg"
  },
  {
    title: "Book with confidence",
    body: "Support booking steps with social-proof moments and subtle overlays that keep text highly legible.",
    imageSrc: "/venue/placeholder.jpg"
  },
  {
    title: "Track momentum",
    body: "Highlight activity streaks and follow-through moments using short loops that never distract from CTAs.",
    imageSrc: "/placeholder-user.jpg"
  }
] as const

const testimonials = [
  {
    quote: "Tourify cut our booking coordination time in half within the first month.",
    attribution: "Venue operations lead"
  },
  {
    quote: "The matching flow made it easy to discover collaborators who actually fit our route.",
    attribution: "Independent artist manager"
  },
  {
    quote: "We finally have one place for discovery, outreach, and booking updates.",
    attribution: "Promoter team"
  }
] as const

export function TourifyLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        Skip to main content
      </a>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-10" />
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-purple-500 opacity-20 mix-blend-multiply blur-xl filter animate-blob motion-reduce:animate-none" />
        <div className="animation-delay-2000 absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500 opacity-20 mix-blend-multiply blur-xl filter animate-blob motion-reduce:animate-none" />
        <div className="animation-delay-4000 absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500 opacity-20 mix-blend-multiply blur-xl filter animate-blob motion-reduce:animate-none" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="Tourify home">
            <TourifyLogo variant="white" size="lg" className="h-9 w-auto drop-shadow-lg" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
            <Link href={HOW_IT_WORKS_HREF} className="hidden text-sm text-slate-300 transition hover:text-white sm:inline-flex">
              How it works
            </Link>
            <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
              <Link href={SIGNIN_HREF} aria-label="Sign in to your Tourify account">
                {SECONDARY_CTA_LABEL}
              </Link>
            </Button>
            <Button
              asChild
              className={primaryCtaClassName}
            >
              <Link href={SIGNUP_HREF} aria-label="Create your Tourify account">
                {PRIMARY_CTA_LABEL}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
            <LandingHeroWithAuth />
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left lg:pt-4">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Tourify platform</p>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Connect. Create. Tour.
              </h1>
              <p className="mx-auto mt-6 text-pretty text-lg text-slate-200 sm:text-xl lg:mx-0">
                The same platform you see on our demo — profiles, discovery, and booking tools for artists, venues, and the
                industry around them. Use the form to get started — switch tabs anytime to sign in.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className={primaryCtaClassName}
                >
                  <Link href={SIGNUP_HREF} aria-label="Create your Tourify account">
                    {PRIMARY_CTA_LABEL}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className={secondaryCtaClassName}>
                  <Link href={HOW_IT_WORKS_HREF} aria-label="Jump to how Tourify works">
                    See how it works
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {trustStats.map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xl font-semibold text-white">{value}</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-300">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section id="how-it-works" aria-label="How Tourify works" className="mx-auto mt-20 scroll-mt-24 grid gap-5 md:grid-cols-3">
            <h2 className="sr-only">How Tourify works</h2>
            {pillars.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
              >
                <div className="mb-4 inline-flex rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-2.5 text-cyan-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
                <Link
                  href={SIGNUP_HREF}
                  aria-label="Create your Tourify account"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-purple-200 transition hover:text-white"
                >
                  {PRIMARY_CTA_LABEL}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              </div>
            ))}
          </section>

          <section className="mx-auto mt-12" aria-label="Media-guided moments">
            <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Media moments that guide action</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-300 sm:text-base">
              Drop in stills or short loops from your content library while preserving readability, hierarchy, and conversion flow.
            </p>
          </section>

          <div className="mx-auto mt-6 grid gap-4 sm:grid-cols-3">
            {mediaMoments.map(({ title, body, imageSrc }) => (
              <div
                key={title}
                className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
              >
                <div className="relative h-28 overflow-hidden">
                  <Image
                    src={imageSrc}
                    alt={`${title} visual preview`}
                    fill
                    className="object-cover opacity-45"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/10 to-cyan-500/20" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="mx-auto mt-12" aria-label="Customer trust statements">
            <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">Trusted by teams in live music</h2>
          </section>

          <div className="mx-auto mt-6 grid gap-4 sm:grid-cols-3">
            {testimonials.map(({ quote, attribution }) => (
              <blockquote
                key={attribution}
                className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
              >
                <p className="text-sm leading-relaxed text-slate-200">&ldquo;{quote}&rdquo;</p>
                <footer className="mt-3 text-xs uppercase tracking-[0.14em] text-cyan-100/90">{attribution}</footer>
              </blockquote>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-3xl rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-10">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Built for everyone in live music</h2>
            <p className="mt-3 text-slate-200">
              Pick your path — every role lands in the same product experience as demo.tourify.live.
            </p>
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
              {audiences.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <Icon className="mb-2 h-5 w-5 text-fuchsia-200" aria-hidden />
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{body}</p>
                </div>
              ))}
            </div>
            <Button
              asChild
              size="lg"
              className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Link href={SIGNUP_HREF} aria-label="Create your Tourify account">
                {PRIMARY_CTA_LABEL}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-purple-500/10 p-8 text-center shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/90">Ready when you are</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Bring your next show to life in one workflow</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-200">
              Start with discovery, move to booking, and keep every stakeholder aligned without jumping between disconnected tools.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className={primaryCtaClassName}
              >
                <Link href={SIGNUP_HREF} aria-label="Create your Tourify account">
                  {PRIMARY_CTA_LABEL}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className={secondaryCtaClassName}>
                <Link href={SIGNIN_HREF} aria-label="Sign in to your Tourify account">
                  {SECONDARY_CTA_LABEL}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/10 bg-slate-950/50 py-10 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center text-sm text-slate-400 sm:flex-row sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <TourifyLogo variant="white" size="md" className="h-8 w-auto opacity-90" />
              <p>© {new Date().getFullYear()} Tourify. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <Link href="/terms" className="text-slate-300 underline-offset-4 hover:text-white hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="text-slate-300 underline-offset-4 hover:text-white hover:underline">
                Privacy
              </Link>
              <Link href={SIGNUP_HREF} aria-label="Create your Tourify account" className="font-medium text-purple-200 hover:text-white">
                {PRIMARY_CTA_LABEL}
              </Link>
              <Link href={SIGNIN_HREF} aria-label="Sign in to your Tourify account" className="text-slate-300 hover:text-white">
                {SECONDARY_CTA_LABEL}
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
