"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, ExternalLink, Wallet } from "lucide-react"
import { toast } from "sonner"

interface StripeConnectStatus {
  connected: boolean
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

export function StripeConnectSetup() {
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus>({
    connected: false,
    accountId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadConnectStatus()
  }, [])

  async function loadConnectStatus() {
    try {
      const res = await fetch("/api/stripe/connect", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setConnectStatus(data)
      }
    } catch {}
  }

  async function handleConnectStripe() {
    setIsLoading(true)
    try {
      if (!connectStatus.connected) {
        const createRes = await fetch("/api/stripe/connect", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_account" }),
        })
        if (!createRes.ok) {
          const body = await createRes.json()
          if (!body.accountId) {
            toast.error(body.error || "Failed to create Stripe account")
            return
          }
        }
      }

      const linkRes = await fetch("/api/stripe/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "onboarding_link" }),
      })
      const linkData = await linkRes.json()
      if (linkData.url) window.location.href = linkData.url
      else toast.error(linkData.error || "Failed to generate onboarding link")
    } catch {
      toast.error("Failed to connect Stripe account")
    } finally {
      setIsLoading(false)
    }
  }

  async function openStripeDashboard() {
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard_link" }),
      })
      const data = await res.json()
      if (data.url) window.open(data.url, "_blank")
      else toast.error(data.error || "Failed to open dashboard")
    } catch {
      toast.error("Failed to open Stripe dashboard")
    }
  }

  if (connectStatus.chargesEnabled) {
    return (
      <Card className="border-green-500/20 bg-green-900/20 rounded-xl">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-green-500/20 p-2">
            <Wallet className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-300">Stripe Connected</p>
            <p className="text-xs text-green-400/70">
              Payments and payouts are active. Buyers pay your listed price + 10% Tourify service fee.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-green-500/30 text-green-300 hover:bg-green-500/10 rounded-full"
            onClick={openStripeDashboard}
          >
            View Dashboard
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-purple-500/20 p-3">
            <CreditCard className="h-6 w-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {connectStatus.connected ? "Complete your Stripe setup" : "Connect your Stripe account"}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Connect your Stripe account to receive direct payments from buyers.
              Tourify adds a 10% service fee on top of your listed price &mdash; you keep 100% of what you set.
            </p>
            <Button
              className="mt-3 rounded-full bg-purple-600 px-6 hover:bg-purple-700"
              onClick={handleConnectStripe}
              disabled={isLoading}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isLoading
                ? "Setting up..."
                : connectStatus.connected && !connectStatus.detailsSubmitted
                  ? "Complete Stripe Setup"
                  : "Set up Stripe Connect"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
