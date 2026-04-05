import Link from "next/link"
import { ArrowRight, Building2, Mic2, Radio, Sparkles, Users } from "lucide-react"
import { TourifyLogo } from "@/components/tourify-logo"
import { Button } from "@/components/ui/button"

const SIGNUP_HREF = "/login?tab=signup"
const SIGNIN_HREF = "/login?tab=signin"

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

export function TourifyLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-10" />
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-purple-500 opacity-20 mix-blend-multiply blur-xl filter animate-blob" />
        <div className="animation-delay-2000 absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500 opacity-20 mix-blend-multiply blur-xl filter animate-blob" />
        <div className="animation-delay-4000 absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500 opacity-20 mix-blend-multiply blur-xl filter animate-blob" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="Tourify home">
            <TourifyLogo variant="white" size="lg" className="h-9 w-auto drop-shadow-lg" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
            <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
              <Link href={SIGNIN_HREF}>Sign in</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700"
            >
              <Link href={SIGNUP_HREF}>
                Sign up free
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">Tourify is live</p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Connect. Create. Tour.
            </h1>
            <p className="mx-auto mt-6 text-pretty text-lg text-slate-200 sm:text-xl">
              The same platform you see on our demo — profiles, discovery, and booking tools for artists, venues, and the
              industry around them. Create your account and start in minutes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                asChild
                size="lg"
                className="w-full min-w-[200px] bg-gradient-to-r from-purple-600 to-blue-600 text-base shadow-xl shadow-purple-500/30 hover:from-purple-700 hover:to-blue-700 sm:w-auto"
              >
                <Link href={SIGNUP_HREF}>
                  Create free account
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full border-white/25 bg-white/5 text-white hover:bg-white/10 sm:w-auto">
                <Link href={SIGNIN_HREF}>Already a member? Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-20 grid gap-5 md:grid-cols-3">
            {pillars.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-xl"
              >
                <div className="mb-4 inline-flex rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-2.5 text-cyan-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
                <Link
                  href={SIGNUP_HREF}
                  className="mt-4 inline-flex items-center text-sm font-semibold text-purple-200 transition hover:text-white"
                >
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              </div>
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
              className="mt-8 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700"
            >
              <Link href={SIGNUP_HREF}>
                Sign up — it&apos;s free
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Link>
            </Button>
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
              <Link href={SIGNUP_HREF} className="font-medium text-purple-200 hover:text-white">
                Sign up
              </Link>
              <Link href={SIGNIN_HREF} className="text-slate-300 hover:text-white">
                Sign in
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
