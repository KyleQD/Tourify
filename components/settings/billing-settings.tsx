"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, ExternalLink, Check, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface SubscriptionInfo {
  status: string
  stripePriceId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const PLAN_PRICES: Record<string, { label: string; priceId: string; price: number }> = {
  standard: {
    label: "Standard",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID ?? "price_standard",
    price: 49,
  },
  pro: {
    label: "Pro",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "price_pro",
    price: 99,
  },
}

export function BillingSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [fetchingSubscription, setFetchingSubscription] = useState(true)

  useEffect(() => {
    loadSubscription()
  }, [])

  async function loadSubscription() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("subscriptions")
        .select("status, stripe_price_id, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        setSubscription({
          status: data.status,
          stripePriceId: data.stripe_price_id,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
        })
      }
    } catch {
      // Silently fail — user may not have subscriptions table yet
    } finally {
      setFetchingSubscription(false)
    }
  }

  async function handleSubscribe(priceId: string) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to create checkout session")

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "Could not start checkout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const response = await fetch("/api/subscriptions/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to open billing portal")

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "Could not open billing portal. Please try again.",
        variant: "destructive",
      })
    } finally {
      setPortalLoading(false)
    }
  }

  const currentPlanKey = Object.entries(PLAN_PRICES).find(
    ([, plan]) => plan.priceId === subscription?.stripePriceId,
  )?.[0]

  const currentPlan = currentPlanKey
    ? PLAN_PRICES[currentPlanKey]
    : null

  const hasActiveSubscription = subscription && ["active", "trialing"].includes(subscription.status)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription and billing information.</CardDescription>
            </div>
            {fetchingSubscription ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : hasActiveSubscription ? (
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                {currentPlan?.label ?? "Active"} Plan
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Free
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hasActiveSubscription ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Payment & Invoices</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage payment methods, view invoices, and update billing details via Stripe.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      Manage Billing
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium">Billing Cycle</h4>
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? "Cancels at end of period"
                      : subscription.currentPeriodEnd
                        ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                        : "Active subscription"}
                  </p>
                  {subscription.status === "past_due" && (
                    <Badge variant="destructive" className="mt-2">Past Due</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You are currently on the free plan. Upgrade below to unlock more features.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that best fits your needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Standard</h3>
                {currentPlanKey === "standard" && (
                  <Badge variant="outline" className="bg-purple-600 text-white">Current</Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">${PLAN_PRICES.standard.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Separator className="my-4" />
              <ul className="space-y-2 text-sm">
                {["Up to 10 team members", "10 GB storage", "20 events per month", "Basic analytics", "Email support"].map((f) => (
                  <li key={f} className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlanKey !== "standard" && !hasActiveSubscription && (
                <Button
                  className="mt-6 w-full"
                  variant="outline"
                  onClick={() => handleSubscribe(PLAN_PRICES.standard.priceId)}
                  disabled={isLoading}
                >
                  {isLoading ? "Redirecting..." : "Subscribe to Standard"}
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-purple-600 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Pro</h3>
                {currentPlanKey === "pro" ? (
                  <Badge variant="outline" className="bg-purple-600 text-white">Current</Badge>
                ) : (
                  <Badge className="bg-purple-600 text-white">Recommended</Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">${PLAN_PRICES.pro.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Separator className="my-4" />
              <ul className="space-y-2 text-sm">
                {["Unlimited team members", "50 GB storage", "Unlimited events", "Advanced analytics", "Priority support", "Custom branding", "API access"].map((f) => (
                  <li key={f} className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {currentPlanKey !== "pro" && (
                <Button
                  className="mt-6 w-full"
                  onClick={() => handleSubscribe(PLAN_PRICES.pro.priceId)}
                  disabled={isLoading}
                >
                  {isLoading ? "Redirecting..." : hasActiveSubscription ? "Upgrade to Pro" : "Subscribe to Pro"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasActiveSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View invoices and manage your subscription in the Stripe portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              View Invoices in Stripe
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
