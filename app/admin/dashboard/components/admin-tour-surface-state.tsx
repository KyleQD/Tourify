"use client"

import { AlertCircle, AlertTriangle, Clock, Lock, WifiOff } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TourSurfaceState } from "@/lib/admin/tour-surface-state"

interface AdminTourSurfaceStateProps {
  state: TourSurfaceState
  onRetry?: () => void
}

const KIND_STYLES: Record<
  Exclude<TourSurfaceState["kind"], "loading" | "ready" | "empty">,
  { border: string; bg: string; iconBg: string; icon: typeof AlertCircle; text: string }
> = {
  permission: {
    border: "border-amber-700/30",
    bg: "bg-amber-950/20",
    iconBg: "bg-amber-500/15",
    icon: Lock,
    text: "text-amber-300",
  },
  unavailable_dependency: {
    border: "border-orange-700/30",
    bg: "bg-orange-950/20",
    iconBg: "bg-orange-500/15",
    icon: WifiOff,
    text: "text-orange-300",
  },
  stale_snapshot: {
    border: "border-cyan-700/30",
    bg: "bg-cyan-950/20",
    iconBg: "bg-cyan-500/15",
    icon: Clock,
    text: "text-cyan-300",
  },
  system_error: {
    border: "border-red-700/30",
    bg: "bg-red-950/20",
    iconBg: "bg-red-500/15",
    icon: AlertCircle,
    text: "text-red-300",
  },
}

export function AdminTourSurfaceState({ state, onRetry }: AdminTourSurfaceStateProps) {
  if (state.kind === "loading" || state.kind === "ready" || state.kind === "empty") return null

  const style = KIND_STYLES[state.kind]
  const Icon = style?.icon || AlertTriangle
  const showRetry = state.canRetry && onRetry

  return (
    <Card className={`rounded-sm backdrop-blur-sm ${style.bg} ${style.border}`}>
      <CardContent className="flex items-start gap-3 p-5">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${style.iconBg}`}>
          <Icon className={`h-5 w-5 ${style.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold ${style.text}`}>{state.title}</h3>
          <p className={`mt-0.5 text-sm opacity-80 ${style.text}`}>{state.message}</p>
          {state.actionHint ? (
            <p className="mt-1 text-xs text-slate-400">{state.actionHint}</p>
          ) : null}
          {state.correlationId ? (
            <p className="mt-2 font-mono text-[11px] text-slate-500">
              Correlation: {state.correlationId}
            </p>
          ) : null}
          {showRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className={`mt-3 border-current/40 ${style.text} hover:bg-black/20`}
            >
              Try again
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
