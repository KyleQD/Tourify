"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { BriefcaseBusiness, CheckCircle2, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Preview {
  status: string
  role: string | null
  origin: string | null
  eventId: string | null
  tourId: string | null
  name: string
  shiftDate: string | null
  startTime: string | null
  endTime: string | null
}

export default function StaffingInvitationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = String(params?.token || "")
  const returnPath = useMemo(() => `/staffing/invite/${encodeURIComponent(token)}`, [token])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsSignIn, setNeedsSignIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/staffing/invitations/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (cancelled) return
        if (!response.ok) setError(body.error || "Invitation not found.")
        else setPreview(body.invitation)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  async function accept() {
    setAccepting(true)
    setError(null)
    setNeedsSignIn(false)
    try {
      const response = await fetch(`/api/staffing/invitations/${encodeURIComponent(token)}`, { method: "POST" })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setNeedsSignIn(true)
        setError("Sign in with the account that received this invitation.")
        return
      }
      if (!response.ok) throw new Error(body.error || "Unable to accept this invitation.")
      router.push(body.onboardingUrl || "/work/tasks")
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept this invitation.")
    } finally {
      setAccepting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-xl border-border bg-card shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Staffing invitation</CardTitle>
            <CardDescription>Accept to activate your assignment and receive your onboarding packet.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground" aria-busy="true">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invitation…
            </div>
          ) : preview ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{preview.name}</p>
                  <p className="text-sm text-muted-foreground">{preview.role || "Staff"}</p>
                </div>
                <Badge variant="outline">{preview.status}</Badge>
              </div>
              {preview.shiftDate ? (
                <p className="text-sm text-muted-foreground">
                  {preview.shiftDate} · {preview.startTime || "TBD"}–{preview.endTime || "TBD"}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <Alert variant="destructive"><AlertTitle>Invitation unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

          {preview?.status === "pending" ? (
            <Button className="w-full" size="lg" disabled={accepting} onClick={() => void accept()}>
              {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Accept and start onboarding
            </Button>
          ) : null}
          {needsSignIn ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline"><Link href={`/login?redirectTo=${encodeURIComponent(returnPath)}`}>Sign in</Link></Button>
              <Button asChild><Link href={`/signup?next=${encodeURIComponent(returnPath)}`}>Create account</Link></Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
