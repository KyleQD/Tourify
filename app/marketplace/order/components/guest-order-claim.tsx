"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { extractApiError } from "@/lib/api/extract-error"
import {
  buildOrderClaimLoginHref,
  buildOrderCleanUrl,
} from "@/lib/marketplace/order-claim"
import { CheckCircle, Loader2 } from "lucide-react"

interface GuestOrderClaimProps {
  token: string
}

type ClaimStatus = "idle" | "claiming" | "success" | "error"

/**
 * Guest "Save your order" claim trigger for a paid guest order confirmation.
 *
 * - Renders the canonical login CTAs (`/login?tab=signup|signin`) with a
 *   `redirectTo` back to this order page carrying `?claim=1`.
 * - When the page is entered with `?claim=1` after sign-up/sign-in, POSTs the
 *   claim (the server requires the account email to match the order's
 *   `guest_email`) and then reloads the clean order URL so the server page
 *   re-renders as claimed and the prompt disappears.
 * - Lets an already signed-in visitor link the order immediately without
 *   leaving the page.
 */
export function GuestOrderClaim({ token }: GuestOrderClaimProps) {
  const { isAuthenticated } = useAuth()
  const [status, setStatus] = useState<ClaimStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const autoClaimStarted = useRef(false)

  const claimOrder = useCallback(async (): Promise<boolean> => {
    setStatus("claiming")
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/marketplace/order/${encodeURIComponent(token)}/claim`, {
        method: "POST",
        credentials: "include",
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setStatus("error")
        setErrorMessage(extractApiError(body, "We could not link this order to your account."))
        return false
      }
      setStatus("success")
      return true
    } catch {
      setStatus("error")
      setErrorMessage("Unable to link your order right now. Please try again.")
      return false
    }
  }, [token])

  // Post-login auto claim: the login portal redirected here with ?claim=1.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (autoClaimStarted.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("claim") !== "1") return
    autoClaimStarted.current = true
    void claimOrder().then((ok) => {
      if (ok) {
        // Full navigation re-renders the server page: the prompt disappears
        // because buyer_user_id is now set on the order.
        window.location.replace(buildOrderCleanUrl(token))
      }
    })
  }, [claimOrder, token])

  async function handleManualClaim() {
    const ok = await claimOrder()
    if (ok) window.location.replace(buildOrderCleanUrl(token))
  }

  const isClaiming = status === "claiming"

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-5 space-y-3">
      <div>
        <h3 className="text-white font-semibold text-sm">Save your order to a Tourify account</h3>
        <p className="text-slate-400 text-sm mt-1">
          Create a free account or sign in to permanently link this order, get faster future
          checkouts, and access your digital downloads any time.
        </p>
      </div>

      {status === "success" ? (
        <p className="flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4" />
          Order linked to your account. Taking you there…
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {isAuthenticated ? (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => void handleManualClaim()}
                disabled={isClaiming}
              >
                {isClaiming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Link this order to my account
              </Button>
            ) : (
              <>
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Link href={buildOrderClaimLoginHref(token, "signup")}>Create account</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:text-white"
                >
                  <Link href={buildOrderClaimLoginHref(token, "signin")}>Sign in</Link>
                </Button>
              </>
            )}
          </div>
          {status === "error" && errorMessage ? (
            <p className="text-rose-300 text-sm" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {!isAuthenticated ? (
            <p className="text-slate-500 text-xs">
              Use the same email address you checked out with to link this order.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}