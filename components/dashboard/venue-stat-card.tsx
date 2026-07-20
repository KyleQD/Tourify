"use client"

import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { VENUE_CARD } from "@/components/dashboard/venue-tokens"

interface VenueStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  tone?: "emerald" | "amber" | "blue" | "zinc"
  change?: number
  trend?: "up" | "down" | "neutral"
  isLoading?: boolean
}

const TONE_MAP = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-300" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-300" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-300" },
  zinc: { bg: "bg-zinc-500/10", text: "text-zinc-300" },
}

export function VenueStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "emerald",
  change,
  trend = "neutral",
  isLoading = false,
}: VenueStatCardProps) {
  const resolved = TONE_MAP[tone]

  return (
    <Card className={`${VENUE_CARD} border-zinc-800`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-zinc-100">{isLoading ? "…" : value}</p>
              {change !== undefined && change !== 0 ? (
                <div
                  className={`flex items-center gap-0.5 text-xs ${
                    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-zinc-400"
                  }`}
                >
                  {trend === "up" ? <TrendingUp className="h-3 w-3" /> : null}
                  {trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
                  <span>
                    {change > 0 ? "+" : ""}
                    {change}%
                  </span>
                </div>
              ) : null}
            </div>
            {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${resolved.bg}`}>
            <Icon className={`h-4 w-4 ${resolved.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
