"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export function BillingSettings() {

  return (
    <div className="space-y-6">
      <Card className="border-purple-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription and billing information.</CardDescription>
            </div>
            <Badge className="bg-purple-600 text-white">
              Beta — All Features Free
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-purple-600/30 bg-purple-600/5 p-4 text-center space-y-2">
            <p className="text-sm font-medium">
              All Pro features are free during the beta period.
            </p>
            <p className="text-sm text-muted-foreground">
              Enjoy unlimited access to every feature at no cost. We&apos;ll let you know before paid plans are activated.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s Included</CardTitle>
          <CardDescription>Everything is unlocked while we&apos;re in beta.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              "Unlimited team members",
              "Unlimited storage",
              "Unlimited events",
              "Advanced analytics",
              "Priority support",
              "Custom branding",
              "API access",
              "All account types",
            ].map((f) => (
              <li key={f} className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
