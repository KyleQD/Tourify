"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleUserRound,
  Loader2,
  MessageSquare,
  RefreshCw,
  Ticket,
} from "lucide-react"

import type {
  GeneralActionCenterPayload,
  GeneralActionItem,
  GeneralActionSource,
} from "@/lib/general/action-center"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const ICONS: Record<GeneralActionSource, typeof BriefcaseBusiness> = {
  assignments: BriefcaseBusiness,
  applications: CheckCircle2,
  messages: MessageSquare,
  tickets: Ticket,
  profile: CircleUserRound,
}

function valueLabel(item: GeneralActionItem): string {
  if (item.state === "unavailable" || item.count === null) return "Unavailable"
  if (item.id === "profile") return `${item.count}%`
  return String(item.count)
}

export function GeneralActionCenter() {
  const [payload, setPayload] = useState<GeneralActionCenterPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/dashboard/action-center", {
        credentials: "include",
        cache: "no-store",
      })
      const body = (await response.json().catch(() => null)) as
        | { data?: GeneralActionCenterPayload; error?: string }
        | null
      if (!response.ok || !body?.data) {
        throw new Error(body?.error || "Your current actions could not be loaded.")
      }
      setPayload(body.data)
    } catch (requestError) {
      setPayload(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Your current actions could not be loaded.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-white">Your next actions</CardTitle>
          <CardDescription className="text-gray-400">
            Live status from your General account.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={load}
          disabled={isLoading}
          aria-label="Refresh next actions"
          className="text-gray-300 hover:bg-white/10 hover:text-white"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && !payload ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading your next actions">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100"
            role="alert"
          >
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Actions unavailable</p>
                <p className="mt-1 text-sm text-rose-100/80">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        {payload ? (
          <div className="grid gap-3">
            {payload.partial ? (
              <p className="text-xs text-amber-300" role="status">
                Some sources are temporarily unavailable. Available counts are still current.
              </p>
            ) : null}
            {payload.items.map((item) => {
              const Icon = ICONS[item.id]
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{item.label}</span>
                      <Badge
                        variant="outline"
                        className={
                          item.state === "unavailable"
                            ? "border-amber-400/30 text-amber-200"
                            : item.priority === "now"
                              ? "border-cyan-400/30 text-cyan-200"
                              : "border-white/15 text-gray-300"
                        }
                      >
                        {valueLabel(item)}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-sm text-gray-400">{item.description}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                    aria-hidden="true"
                  />
                </Link>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

