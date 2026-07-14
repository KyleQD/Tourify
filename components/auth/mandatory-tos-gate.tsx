"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { PLATFORM_TOS_VERSION } from "@/components/legal/legal-constants"

const PLATFORM_TOS_TEMPLATE_ID = "a0000000-0000-0000-0000-000000000001"

function pathnameExemptsMandatoryTos(pathname: string) {
  if (pathname.startsWith("/login")) return true
  if (pathname.startsWith("/auth/")) return true
  if (pathname.startsWith("/onboarding")) return true
  if (pathname === "/terms" || pathname === "/privacy") return true
  if (pathname.startsWith("/legal/")) return true
  if (pathname === "/marketplace/seller-agreement") return true
  return false
}

export function MandatoryTosGate() {
  const pathname = usePathname() ?? ""
  const { user, loading: authLoading, signOut } = useAuth()
  const [profileChecked, setProfileChecked] = useState(false)
  const [needsTos, setNeedsTos] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const refreshTosRequirement = useCallback(async () => {
    if (!user?.id) {
      setProfileChecked(true)
      setNeedsTos(false)
      return
    }

    if (pathnameExemptsMandatoryTos(pathname)) {
      setProfileChecked(true)
      setNeedsTos(false)
      return
    }

    setProfileChecked(false)
    const { data, error } = await supabase
      .from("profiles")
      .select("tos_accepted_at, tos_version")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error("[MandatoryTosGate] profile fetch failed:", error.message)
      setNeedsTos(false)
      setProfileChecked(true)
      return
    }

    const acceptedVersion = data?.tos_version ?? 0
    const needsAcceptance =
      !data?.tos_accepted_at || acceptedVersion < PLATFORM_TOS_VERSION

    setNeedsTos(needsAcceptance)
    setProfileChecked(true)
  }, [user?.id, pathname])

  useEffect(() => {
    if (authLoading) return
    void refreshTosRequirement()
  }, [authLoading, refreshTosRequirement])

  const open = Boolean(user && profileChecked && needsTos && !pathnameExemptsMandatoryTos(pathname))

  async function handleAccept() {
    if (!user?.id || !accepted) return
    setIsSubmitting(true)
    setSubmitError(null)
    const now = new Date().toISOString()

    try {
      const res = await fetch("/api/agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: PLATFORM_TOS_TEMPLATE_ID,
          template_version: PLATFORM_TOS_VERSION,
          context: "first_session",
          signature_method: "clickwrap",
          metadata: { source: "mandatory_tos_gate" },
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || json.success === false) {
        setSubmitError(json.error || "Could not record agreement. Try again.")
        setIsSubmitting(false)
        return
      }
    } catch {
      setSubmitError("Network error recording agreement. Try again.")
      setIsSubmitting(false)
      return
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        tos_accepted_at: now,
        tos_version: PLATFORM_TOS_VERSION,
        privacy_accepted_at: now,
      })
      .eq("id", user.id)

    if (profileError) {
      setSubmitError(profileError.message || "Could not save acceptance. Try again.")
      setIsSubmitting(false)
      return
    }

    setNeedsTos(false)
    setAccepted(false)
    setIsSubmitting(false)
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-50">Accept terms to continue</AlertDialogTitle>
          <AlertDialogDescription className="text-left text-slate-300">
            Before using Tourify, confirm you have read and agree to our policies (links open in a new tab).
          </AlertDialogDescription>
          <div className="space-y-3 text-left text-sm text-slate-300">
            <p>
              <Link href="/terms" className="text-purple-400 underline underline-offset-2" target="_blank">
                Terms of Service
              </Link>
              {" · "}
              <Link href="/privacy" className="text-purple-400 underline underline-offset-2" target="_blank">
                Privacy Policy
              </Link>
            </p>
            <div className="flex items-start gap-2 rounded-md border border-slate-700 bg-slate-950/60 p-3">
              <Checkbox
                id="mandatory-tos-accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5 border-slate-500 data-[state=checked]:bg-purple-600"
              />
              <Label htmlFor="mandatory-tos-accept" className="cursor-pointer font-normal leading-snug">
                I have read and agree to the Terms of Service and Privacy Policy.
              </Label>
            </div>
            {submitError ? <p className="text-sm text-red-400">{submitError}</p> : null}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            type="button"
            className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
            onClick={() => void signOut()}
          >
            Sign out
          </AlertDialogCancel>
          <Button
            type="button"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
            disabled={!accepted || isSubmitting}
            onClick={() => void handleAccept()}
          >
            {isSubmitting ? "Saving…" : "Agree and continue"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
