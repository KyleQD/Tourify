"use client"

import { useState, useEffect } from "react"
import { Calendar, Copy, ExternalLink, Download, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Props {
  tourId: string
  tourName?: string
}

export function TourCalendarSync({ tourId, tourName }: Props) {
  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Base URL for the iCal feed — dynamic [id] route, no .ics suffix needed
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const icalUrl = `${baseUrl}/api/calendar/tours/${tourId}${calendarToken ? `?token=${calendarToken}` : ''}`

  async function fetchToken() {
    setLoading(true)
    try {
      const res = await fetch(`/api/tours/${tourId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCalendarToken(data.tour?.calendar_token || null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchToken() }, [])

  function copyLink() {
    navigator.clipboard.writeText(icalUrl)
    toast.success('Calendar link copied to clipboard')
  }

  function subscribeGoogle() {
    const encoded = encodeURIComponent(icalUrl)
    window.open(`https://calendar.google.com/calendar/r?cid=${encoded}`, '_blank')
  }

  function subscribeOutlook() {
    const encoded = encodeURIComponent(icalUrl)
    window.open(`https://outlook.live.com/calendar/0/addfromweb?url=${encoded}`, '_blank')
  }

  function downloadIcs() {
    window.location.href = icalUrl
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-white text-base">Tour Calendar Sync</CardTitle>
            <Badge className="bg-emerald-500/20 text-emerald-400 ml-auto">iCal / RFC 5545</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            Subscribe to <strong className="text-slate-200">{tourName || 'this tour'}</strong>&apos;s schedule from any calendar app. The feed updates automatically when shows are added or changed.
          </p>

          {/* Feed URL */}
          <div className="space-y-2">
            <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Calendar Feed URL</p>
            <div className="flex gap-2">
              <Input
                value={loading ? 'Loading...' : icalUrl}
                readOnly
                className="bg-slate-800/50 border-slate-700/50 text-slate-300 text-sm font-mono flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="border-slate-700 text-slate-300 shrink-0"
                disabled={loading}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-slate-500 text-xs">
              This URL is secured with a unique token. Regenerate below to revoke existing subscriptions.
            </p>
          </div>

          {/* Subscribe buttons */}
          <div className="space-y-2">
            <p className="text-slate-400 text-xs uppercase font-medium tracking-wider">Subscribe in your Calendar</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={subscribeGoogle}
                disabled={loading}
                className="bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Google Calendar
              </Button>
              <Button
                onClick={subscribeOutlook}
                disabled={loading}
                className="bg-blue-900/20 border border-blue-700/30 text-blue-300 hover:bg-blue-900/30"
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Outlook
              </Button>
              <Button
                onClick={downloadIcs}
                disabled={loading}
                className="border-slate-700 text-slate-300"
                variant="outline"
                size="sm"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download .ics
              </Button>
            </div>
          </div>

          {/* What's included */}
          <Card className="bg-slate-800/30 border-slate-700/30 rounded-sm">
            <CardContent className="p-3">
              <p className="text-slate-400 text-xs font-medium mb-2">Included in the calendar feed:</p>
              <ul className="text-slate-500 text-xs space-y-1">
                <li>• One event per show (date, time, venue)</li>
                <li>• Load-in time for each show</li>
                <li>• Sound check time (when set)</li>
                <li>• Doors-open time (when set)</li>
                <li>• Auto-updates when shows are modified</li>
              </ul>
            </CardContent>
          </Card>

          {/* Token management */}
          <div className="pt-2 border-t border-slate-700/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchToken}
              className="text-slate-500 hover:text-slate-300 h-7 text-xs gap-1.5"
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh token
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-event calendar note */}
      <Card className="bg-slate-900/40 border-slate-700/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-slate-400 text-sm">
            <strong className="text-slate-300">Per-event calendars:</strong> Individual event iCal links (with load-in, sound check, doors, and show times) are available from each event&apos;s detail page → Export → Add to Calendar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
