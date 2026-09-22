"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, PlugZap } from "lucide-react"

/**
 * VEN-263 / VEN-301: the previous version of this tab rendered a static demo
 * integration page — fabricated "Production API Key" cards, fake last-used dates and
 * dead Reveal buttons presented as live controls. That violated the no-fake-operations
 * contract, so it is retired. Until the canonical server-side provider adapter
 * (VEN-265–VEN-277) ships, this surface shows an intentional unavailable state only.
 */

export const INTEGRATIONS_CENTER_ENABLED = false

export function IntegrationSettings() {
  if (!INTEGRATIONS_CENTER_ENABLED) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-muted-foreground" aria-hidden />
            Integrations
          </CardTitle>
          <CardDescription>Connected services are not available yet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provider integrations for Venue accounts are being rebuilt on a secure,
            permission-scoped foundation. There are no connected services to show right now,
            and no demo connections are displayed.
          </p>
          <Button asChild variant="outline">
            <Link href="/artist/content?tab=socials">
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage public social links in Content Hub
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
