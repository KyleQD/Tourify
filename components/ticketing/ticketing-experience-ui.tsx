"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, Ticket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type TicketVisualStatus =
  | "valid"
  | "assigned"
  | "transferred"
  | "checked_in"
  | "refunded"
  | "void"
  | "pending"
  | "expired"
  | "canceled"

const STATUS_STYLES: Record<string, string> = {
  valid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  assigned: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  transferred: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  checked_in: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  refunded: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  void: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  expired: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  canceled: "border-slate-400/30 bg-slate-400/10 text-slate-300",
}

export function TicketStatusBadge({ status }: { status?: string | null }) {
  const normalized = String(status || "pending").toLowerCase()
  return (
    <Badge className={cn("border font-medium capitalize", STATUS_STYLES[normalized] ?? STATUS_STYLES.pending)}>
      {normalized.replaceAll("_", " ")}
    </Badge>
  )
}

export function TicketingShell({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <main className={cn("min-h-[calc(100vh-4rem)] bg-background text-foreground", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {backHref ? (
          <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href={backHref}><ArrowLeft className="mr-2 h-4 w-4" />{backLabel}</Link>
          </Button>
        ) : null}
        <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Ticket className="h-4 w-4" />Tourify tickets</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </main>
  )
}

export function TicketEventMeta({
  startsAt,
  venue,
  className,
}: {
  startsAt?: string | null
  venue?: string | null
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground", className)}>
      <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{startsAt ? new Date(startsAt).toLocaleString() : "Date to be announced"}</span>
      {venue ? <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{venue}</span> : null}
    </div>
  )
}

export function TicketEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { label: string; href: string }
}) {
  return (
    <Card className="border-dashed bg-card/50">
      <CardContent className="flex flex-col items-center px-5 py-12 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-sm border border-border bg-muted/50"><Ticket className="h-5 w-5 text-muted-foreground" /></div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
        {action ? <Button asChild className="mt-5"><Link href={action.href}>{action.label}</Link></Button> : null}
      </CardContent>
    </Card>
  )
}

export function TicketStateNotice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "warning" | "success" | "danger"
  title: string
  children: ReactNode
}) {
  const colors = {
    neutral: "border-border bg-muted/40 text-foreground",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    danger: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  }
  return <div className={cn("rounded-sm border px-4 py-3 text-sm", colors[tone])}><p className="font-medium">{title}</p><p className="mt-1 opacity-80">{children}</p></div>
}

export function TicketPassHint() {
  return <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Use the live QR in your wallet. Screenshots can stop working after a transfer, refund, void, or reissue.</p>
}

export function TicketSuccessMark() {
  return <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-emerald-400/30 bg-emerald-400/10"><CheckCircle2 className="h-6 w-6 text-emerald-300" /></div>
}
