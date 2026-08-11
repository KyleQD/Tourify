"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface InvitationPreview {
  id: string
  tourId: string
  tourName: string
  role: string
  channel: string
  status: string
  expiresAt: string
}

export default function TourInvitationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = String(params?.token || "")
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const returnPath = useMemo(() => `/tours/invite/${encodeURIComponent(token)}`, [token])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/tours/invitations/${encodeURIComponent(token)}`, {
        cache: "no-store",
      })
      const body = await response.json().catch(() => ({}))
      if (cancelled) return
      if (!response.ok) setError(body.error || "Invitation not found.")
      else setInvitation(body.invitation)
      setLoading(false)
    }
    if (token) void load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function acceptInvitation() {
    setAccepting(true)
    setError(null)
    setNeedsSignIn(false)
    try {
      const response = await fetch(`/api/tours/invitations/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
      })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setNeedsSignIn(true)
        setError(body.error || "Sign in to continue.")
        return
      }
      if (!response.ok) throw new Error(body.error || "Could not accept invitation.")
      router.push(`/admin/dashboard/tours/${body.tourId}?tab=events`)
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Could not accept invitation.")
    } finally {
      setAccepting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-purple-950/40 px-4 py-12 text-white">
      <Card className="w-full max-w-xl border-slate-700/60 bg-slate-900/80 shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
            <Users className="h-7 w-7 text-cyan-300" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white">Join the tour</CardTitle>
            <CardDescription className="mt-2 text-slate-300">
              Accept a tour-scoped administrator invitation on Tourify.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading invitation…
            </div>
          ) : invitation ? (
            <>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Tour</p>
                <h1 className="mt-2 text-xl font-semibold text-white">{invitation.tourName}</h1>
                <div className="mt-4 flex items-start gap-3 text-sm text-slate-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" />
                  <p>
                    You’ll be able to plan this tour and its events. This does not grant access to
                    unrelated organization projects, billing, or settings.
                  </p>
                </div>
              </div>

              {invitation.status === "pending" ? (
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                  size="lg"
                  disabled={accepting}
                  onClick={() => void acceptInvitation()}
                >
                  {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Accept invitation
                </Button>
              ) : (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                  This invitation is {invitation.status}.
                </div>
              )}
            </>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {needsSignIn ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline" className="border-slate-600 text-slate-200">
                <Link href={`/login?redirectTo=${encodeURIComponent(returnPath)}`}>Sign in</Link>
              </Button>
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href={`/signup?next=${encodeURIComponent(returnPath)}`}>Create account</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
