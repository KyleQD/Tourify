"use client"

import { Suspense } from "react"
import { TourifyAuthPortal } from "@/components/auth/tourify-auth-portal"

function AuthPortalFallback() {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-8 shadow-xl backdrop-blur-xl"
      aria-hidden
    >
      <div className="mx-auto mb-6 h-12 w-12 animate-pulse rounded-xl bg-white/10" />
      <div className="mb-4 h-8 w-3/4 animate-pulse rounded-lg bg-white/10" />
      <div className="mb-8 h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="mb-6 grid grid-cols-2 gap-2">
        <div className="h-10 animate-pulse rounded-md bg-white/10" />
        <div className="h-10 animate-pulse rounded-md bg-white/10" />
      </div>
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-md bg-white/10" />
        <div className="h-10 animate-pulse rounded-md bg-white/10" />
        <div className="h-11 animate-pulse rounded-xl bg-purple-500/20" />
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">Loading sign up…</p>
    </div>
  )
}

export function LandingHeroWithAuth() {
  return (
    <div className="w-full">
      <Suspense fallback={<AuthPortalFallback />}>
        <TourifyAuthPortal
          defaultTab="signup"
          showSecurityFooter={false}
          shardShape={false}
          className="rounded-2xl border-white/15 bg-slate-950/55 shadow-[0_28px_90px_-32px_rgba(0,0,0,0.75)]"
          cardTitle="Create your free account"
          cardDescription="Start free. Choose your account type after signup."
        />
      </Suspense>
    </div>
  )
}
