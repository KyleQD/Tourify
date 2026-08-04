"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  MailCheck,
  Music,
  RotateCw,
  ShieldAlert,
} from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { normalizePostLoginRedirect } from "@/lib/auth/tourify-auth-helpers"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type VerificationState =
  | "checking"
  | "sent"
  | "waiting"
  | "verified"
  | "expired"
  | "rate_limited"
  | "recovery_sent"
  | "failed"

interface VerificationCopy {
  title: string
  description: string
  Icon: typeof Loader2
  iconClass: string
}

const COPY: Record<VerificationState, VerificationCopy> = {
  checking: {
    title: "Checking your account",
    description: "Confirming the current session and verification status.",
    Icon: Loader2,
    iconClass: "animate-spin text-purple-300",
  },
  sent: {
    title: "Check your email",
    description: "We sent a verification link. Open it in this browser to continue.",
    Icon: MailCheck,
    iconClass: "text-cyan-300",
  },
  waiting: {
    title: "Waiting for verification",
    description: "Your account is not verified yet. You can resend the link if it did not arrive.",
    Icon: Clock3,
    iconClass: "text-amber-300",
  },
  verified: {
    title: "Email verified",
    description: "Your account is ready. Continue to your intended destination.",
    Icon: CheckCircle2,
    iconClass: "text-emerald-300",
  },
  expired: {
    title: "Verification link expired",
    description: "Request a new link to continue. The expired link cannot be reused.",
    Icon: ShieldAlert,
    iconClass: "text-amber-300",
  },
  rate_limited: {
    title: "Please wait before trying again",
    description: "Too many verification requests were made. Wait a moment, then resend.",
    Icon: Clock3,
    iconClass: "text-amber-300",
  },
  recovery_sent: {
    title: "Password reset email sent",
    description: "Open the reset link in your email. Return here if you need another request.",
    Icon: MailCheck,
    iconClass: "text-purple-300",
  },
  failed: {
    title: "Verification could not be completed",
    description: "The link may be invalid or already used. Request a new link or contact support.",
    Icon: AlertCircle,
    iconClass: "text-rose-300",
  },
}

export default function VerificationPage() {
  const {
    user,
    loading,
    resendSignupConfirmation,
  } = useAuth()
  const searchParams = useSearchParams()
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  const email = searchParams.get("email")?.trim() ?? ""
  const redirectTo = normalizePostLoginRedirect(
    searchParams.get("redirectTo") ||
      searchParams.get("redirect") ||
      searchParams.get("next") ||
      "/dashboard",
  )
  const state = useMemo<VerificationState>(() => {
    if (loading) return "checking"
    if (user) return "verified"
    const errorCode = (
      searchParams.get("error_code") ||
      searchParams.get("code") ||
      searchParams.get("message") ||
      ""
    ).toLowerCase()
    if (errorCode.includes("expired")) return "expired"
    if (errorCode.includes("rate") || errorCode.includes("too many")) return "rate_limited"
    if (searchParams.get("error") === "true" || errorCode.includes("invalid")) return "failed"
    if (searchParams.get("type") === "recovery") return "recovery_sent"
    if (searchParams.get("type") === "signup") return "sent"
    return "waiting"
  }, [loading, searchParams, user])
  const copy = COPY[state]
  const Icon = copy.Icon

  async function resend() {
    if (!email || isResending) return
    setIsResending(true)
    setResendError(null)
    setResendMessage(null)
    const result = await resendSignupConfirmation(email)
    setIsResending(false)
    if (result.error) {
      const message = result.error.message.toLowerCase()
      setResendError(
        message.includes("rate") || message.includes("too many")
          ? "Too many requests. Wait before trying again."
          : "The verification email could not be sent. Try again or contact support.",
      )
      return
    }
    setResendMessage("A new verification email was sent. Check your inbox and spam folder.")
  }

  const canResend =
    Boolean(email) &&
    ["sent", "waiting", "expired", "failed"].includes(state)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-700/60 bg-slate-900/90 text-slate-100 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <Music className="h-7 w-7 text-purple-400" aria-hidden="true" />
            <span className="font-semibold tracking-wide">TOURIFY</span>
          </div>
          <Icon className={`mb-3 h-12 w-12 ${copy.iconClass}`} aria-hidden="true" />
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription className="text-slate-400">{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email ? (
            <p className="text-center text-sm text-slate-300">
              Link sent to <span className="font-medium text-white">{email}</span>
            </p>
          ) : null}
          {resendMessage ? (
            <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Email sent</AlertTitle>
              <AlertDescription>{resendMessage}</AlertDescription>
            </Alert>
          ) : null}
          {resendError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to resend</AlertTitle>
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          ) : null}
          {!email && canResend === false && state !== "verified" && state !== "checking" ? (
            <p className="text-center text-xs text-slate-500">
              Return to sign in and enter your email to request another link.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-2">
          {state === "verified" ? (
            <Button asChild>
              <Link href={redirectTo}>Continue</Link>
            </Button>
          ) : null}
          {canResend ? (
            <Button type="button" onClick={resend} disabled={isResending}>
              {isResending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Resend email
            </Button>
          ) : null}
          {state !== "checking" && state !== "verified" ? (
            <Button asChild variant="outline">
              <Link href="/login?tab=signin">Back to sign in</Link>
            </Button>
          ) : null}
          {state === "failed" || state === "expired" || state === "rate_limited" ? (
            <Button asChild variant="ghost">
              <a href="mailto:support@tourify.com?subject=Account verification help">
                Contact support
              </a>
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </main>
  )
}
