"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Plus, Sparkles } from "lucide-react"

export function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Platform Integrations
          </CardTitle>
          <CardDescription>
            Social account linking and analytics live in Content Hub. Manage public links and OAuth there.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Content Hub is the canonical place to add public socials, connect OAuth accounts, and sync
            cross-platform analytics.
          </p>
          <Button asChild>
            <Link href="/artist/content?tab=socials">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Content Hub · Socials
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>Manage API keys and access for developers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Production API Key</h4>
                  <p className="text-sm text-muted-foreground">Last used: April 15, 2025</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Reveal
                  </Button>
                  <Button variant="outline" size="sm">
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Development API Key</h4>
                  <p className="text-sm text-muted-foreground">Last used: April 17, 2025</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Reveal
                  </Button>
                  <Button variant="outline" size="sm">
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button variant="outline" className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              View API Docs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Configure webhooks to receive real-time updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Booking Notifications</h4>
                  <p className="text-sm text-muted-foreground">https://example.com/webhooks/bookings</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Test
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Payment Events</h4>
                  <p className="text-sm text-muted-foreground">https://example.com/webhooks/payments</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Test
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
