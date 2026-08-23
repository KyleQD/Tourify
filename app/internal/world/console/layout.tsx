/**
 * Internal World Review Console — layout + authorization gate.
 *
 * Spec: schemas/INTERNAL_WORLD_REVIEW_CONSOLE_SPEC_V0_1.md (v1 scaffold).
 * Access requires ALL of: preview flag on, an authenticated session, and the
 * platform-scoped `world.knowledge.view` permission evaluated under the
 * user's own session via has_global_permission() (never service role).
 */
import Link from "next/link"
import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { hasWorldPermission } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

const NAV = [
  { href: "/internal/world/console", label: "Dashboard" },
  { href: "/internal/world/console/inbox", label: "Inbox" },
  { href: "/internal/world/console/places", label: "Places" },
  { href: "/internal/world/console/culture", label: "Culture" },
  { href: "/internal/world/console/claims", label: "Claims" },
  { href: "/internal/world/console/radio", label: "Radio" },
  { href: "/internal/world/console/media", label: "Media" },
  { href: "/internal/world/console/sources", label: "Sources" },
  { href: "/internal/world/console/ingestion", label: "Ingestion" },
  { href: "/internal/world/console/quality", label: "Quality" },
]

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-slate-200">
      {children}
    </div>
  )
}

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Card>
        <p className="font-medium">Sign in required.</p>
        <p className="mt-2 text-sm text-slate-400">
          The World review console evaluates editorial authority under your authenticated session.
        </p>
      </Card>
    )
  }

  const allowed = await hasWorldPermission("world.knowledge.view")
  if (!allowed) {
    return (
      <Card>
        <p className="font-medium">Access denied.</p>
        <p className="mt-2 text-sm text-slate-400">
          World console access requires the platform-scoped{" "}
          <code className="rounded bg-black/40 px-1">world.knowledge.view</code> permission. Organization roles do not
          confer global canon authority.
        </p>
      </Card>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">World Review Console</h1>
          <p className="mt-1 text-xs text-slate-400">
            Signed in as {user.email} · authority evaluated per session · nothing here publishes automatically
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-slate-300 transition hover:bg-violet-500/20 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  )
}
