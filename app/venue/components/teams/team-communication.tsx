"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

interface TeamCommunicationProps {
  teamId: string
}

/**
 * Legacy team thread UI used mock data. Real venue messaging lives under
 * Staff → Communications (`VenueTeamCommunicationsPanel`) and Event HQ → Chats.
 */
export function TeamCommunication({ teamId }: TeamCommunicationProps) {
  return (
    <Card className="border-slate-700 bg-slate-900/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-100">
          <MessageSquare className="h-5 w-5 text-cyan-400" />
          Team messaging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-400">
        <p>
          Thread UI for team <span className="font-mono text-slate-300">{teamId}</span> is retired in favor of live
          venue channels.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/venue/staff?tab=communications">Open venue communications</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
