'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Copy, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/admin/scheduling/ui/badge'
import { Button } from '@/components/admin/scheduling/ui/button'
import { Input } from '@/components/admin/scheduling/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface OrgCalendarSyncProps {
  compact?: boolean
  className?: string
}

interface TokenPayload {
  orgId: string
  orgName?: string
  calendarToken: string | null
  feedEnabled: boolean
}

export function OrgCalendarSync({ compact = false, className = '' }: OrgCalendarSyncProps) {
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [rotating, setRotating] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const icalUrl = useMemo(() => {
    if (!payload?.orgId) return ''
    const tokenQuery = payload.calendarToken ? `?token=${payload.calendarToken}` : ''
    return `${baseUrl}/api/calendar/org/${payload.orgId}${tokenQuery}`
  }, [baseUrl, payload])

  const webcalUrl = useMemo(() => {
    if (!icalUrl) return ''
    return icalUrl.replace(/^https?:\/\//, 'webcal://')
  }, [icalUrl])

  const loadToken = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/calendar/token', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load calendar feed')
      }
      const data = await res.json()
      setPayload({
        orgId: data.orgId,
        orgName: data.orgName,
        calendarToken: data.calendarToken || null,
        feedEnabled: data.feedEnabled !== false,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load calendar feed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadToken()
  }, [loadToken])

  async function rotateToken() {
    setRotating(true)
    try {
      const res = await fetch('/api/admin/calendar/token', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to rotate token')
      }
      const data = await res.json()
      setPayload({
        orgId: data.orgId,
        orgName: data.orgName,
        calendarToken: data.calendarToken || null,
        feedEnabled: data.feedEnabled !== false,
      })
      toast.success('Calendar token rotated — update existing subscriptions')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rotate token')
    } finally {
      setRotating(false)
    }
  }

  function copyLink(url: string, label: string) {
    if (!url) return
    navigator.clipboard.writeText(url)
    toast.success(`${label} copied`)
  }

  function subscribeGoogle() {
    if (!icalUrl) return
    window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalUrl)}`, '_blank')
  }

  function subscribeOutlook() {
    if (!icalUrl) return
    window.open(`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icalUrl)}`, '_blank')
  }

  function subscribeApple() {
    if (!webcalUrl) return
    window.location.href = webcalUrl
  }

  function downloadIcs() {
    window.location.href = '/api/admin/calendar/export'
  }

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button variant="outline" size="sm" onClick={subscribeGoogle} disabled={loading || !icalUrl}>
          <ExternalLink className="size-3.5" />
          Google
        </Button>
        <Button variant="outline" size="sm" onClick={subscribeApple} disabled={loading || !webcalUrl}>
          <ExternalLink className="size-3.5" />
          Apple
        </Button>
        <Button variant="outline" size="sm" onClick={subscribeOutlook} disabled={loading || !icalUrl}>
          <ExternalLink className="size-3.5" />
          Outlook
        </Button>
        <Button variant="outline" size="sm" onClick={downloadIcs}>
          <Download className="size-3.5" />
          Download
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => copyLink(icalUrl, 'Feed URL')}
          disabled={!icalUrl}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4 rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur', className)}>
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-neon-purple/15 text-neon-purple">
          <Calendar className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Subscribe to Ops Calendar</p>
          <p className="text-[11px] text-muted-foreground">Live iCal / webcal feed</p>
        </div>
        <Badge className="bg-neon-green/15 text-neon-green border-0">Live</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Keep Google, Apple, and Outlook in sync with{' '}
        <strong className="text-foreground">{payload?.orgName || 'your organization'}</strong>
        &apos;s events, tours, shifts, tasks, production, and hiring dates.
      </p>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Calendar Feed URL
        </p>
        <div className="flex gap-2">
          <Input
            value={loading ? 'Loading...' : icalUrl}
            readOnly
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => copyLink(icalUrl, 'Feed URL')}
            disabled={loading || !icalUrl}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Subscribe
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={subscribeGoogle}
            disabled={loading || !icalUrl}
            variant="outline"
            size="sm"
            className="border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
          >
            <ExternalLink className="size-3.5" />
            Google
          </Button>
          <Button
            onClick={subscribeApple}
            disabled={loading || !webcalUrl}
            variant="outline"
            size="sm"
            className="border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10"
          >
            <ExternalLink className="size-3.5" />
            Apple
          </Button>
          <Button
            onClick={subscribeOutlook}
            disabled={loading || !icalUrl}
            variant="outline"
            size="sm"
            className="border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
          >
            <ExternalLink className="size-3.5" />
            Outlook
          </Button>
          <Button onClick={downloadIcs} variant="outline" size="sm">
            <Download className="size-3.5" />
            Download .ics
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={loadToken}
          disabled={loading}
        >
          <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={rotateToken}
          disabled={rotating || loading}
          className="text-neon-amber hover:text-neon-amber"
        >
          <RefreshCw className={cn('size-3', rotating && 'animate-spin')} />
          Rotate token
        </Button>
      </div>
    </div>
  )
}
