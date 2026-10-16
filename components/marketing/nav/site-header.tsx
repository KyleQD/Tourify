"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, ChevronDown, Menu, Play } from "lucide-react"
import { TourifyLogo } from "@/components/tourify-logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { accents } from "@/lib/marketing/accent"
import { features } from "@/lib/marketing/features"
import { personas } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

export const BETA_URL = "https://demo.tourify.live"

type MenuKey = "solutions" | "features"

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState<MenuKey | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function openMenu(key: MenuKey) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(key)
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(null), 120)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-slate-950/80 shadow-lg shadow-black/20 backdrop-blur-xl"
          : "border-transparent bg-slate-950/20 backdrop-blur-md",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <Link href="/" aria-label="Tourify home" className="flex items-center transition-opacity hover:opacity-90">
          <TourifyLogo variant="white" size="lg" className="h-9 w-auto drop-shadow-lg" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {(["solutions", "features"] as const).map((key) => (
            <div key={key} className="relative" onMouseEnter={() => openMenu(key)} onMouseLeave={scheduleClose}>
              <button
                type="button"
                aria-expanded={open === key}
                aria-haspopup="true"
                onClick={() => setOpen(open === key ? null : key)}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium capitalize text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {key}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === key && "rotate-180")} aria-hidden />
              </button>
            </div>
          ))}
          <Link
            href="/#roadmap"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Roadmap
          </Link>
          <Link
            href="/#faq"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            FAQ
          </Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" className="gap-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
            <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
              <Play className="h-3.5 w-3.5" aria-hidden />
              Try the Beta
            </a>
          </Button>
          <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-blue-700"
          >
            <Link href="/#get-started">
              Get started
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto border-white/10 bg-slate-950 text-white">
            <SheetHeader>
              <SheetTitle className="text-left text-white">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-6">
              <MobileGroup title="Solutions" onNavigate={() => setMobileOpen(false)}>
                {personas.map((p) => (
                  <MobileLink key={p.slug} href={`/solutions/${p.slug}`} onNavigate={() => setMobileOpen(false)}>
                    <p.icon className={cn("h-4 w-4", accents[p.accent].text)} aria-hidden />
                    {p.name}
                  </MobileLink>
                ))}
              </MobileGroup>
              <MobileGroup title="Features" onNavigate={() => setMobileOpen(false)}>
                {features.map((f) => (
                  <MobileLink key={f.slug} href={`/features/${f.slug}`} onNavigate={() => setMobileOpen(false)}>
                    <f.icon className={cn("h-4 w-4", accents[f.accent].text)} aria-hidden />
                    {f.title}
                  </MobileLink>
                ))}
              </MobileGroup>
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600">
                  <Link href="/#get-started" onClick={() => setMobileOpen(false)}>
                    Get started
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">
                  <a href={BETA_URL} target="_blank" rel="noopener noreferrer">
                    Try the Beta
                  </a>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {open && (
        <div
          className="absolute inset-x-0 top-full hidden border-b border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl lg:block"
          onMouseEnter={() => openMenu(open)}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto max-w-7xl px-8 py-6">
            {open === "solutions" ? (
              <div className="grid grid-cols-4 gap-3">
                {personas.map((p) => {
                  const a = accents[p.accent]
                  return (
                    <Link
                      key={p.slug}
                      href={`/solutions/${p.slug}`}
                      onClick={() => setOpen(null)}
                      className={cn(
                        "group flex gap-3 rounded-xl border border-transparent p-3 transition-colors hover:bg-white/[0.05]",
                        a.borderHover,
                      )}
                    >
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", a.bg, a.border)}>
                        <p.icon className={cn("h-5 w-5", a.text)} aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{p.name}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-400">{p.short}</span>
                      </span>
                    </Link>
                  )
                })}
                <Link
                  href="/solutions"
                  onClick={() => setOpen(null)}
                  className="flex items-center gap-2 rounded-xl p-3 text-sm font-medium text-purple-300 hover:text-white"
                >
                  All solutions <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {features.map((f) => {
                  const a = accents[f.accent]
                  return (
                    <Link
                      key={f.slug}
                      href={`/features/${f.slug}`}
                      onClick={() => setOpen(null)}
                      className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.05]"
                    >
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", a.bg, a.border)}>
                        <f.icon className={cn("h-4 w-4", a.text)} aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{f.title}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-400">{f.summary}</span>
                      </span>
                    </Link>
                  )
                })}
                <Link
                  href="/features"
                  onClick={() => setOpen(null)}
                  className="flex items-center gap-2 rounded-xl p-3 text-sm font-medium text-purple-300 hover:text-white"
                >
                  All features <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MobileGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
  onNavigate: () => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

function MobileLink({
  href,
  children,
  onNavigate,
}: {
  href: string
  children: React.ReactNode
  onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-slate-200 hover:bg-white/10"
    >
      {children}
    </Link>
  )
}
