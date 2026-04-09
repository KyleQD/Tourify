"use client"

import { Suspense } from "react"
import Link from "next/link"
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
          cardTitle="Join Tourify free"
          cardDescription="Create your account and start in minutes — same experience as our full login page."
        />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        <Link href="/login" className="text-purple-200 underline-offset-4 hover:text-white hover:underline">
          Open full login page
        </Link>{" "}
        for invitations and deep links.
      </p>
    </div>
  )
}
