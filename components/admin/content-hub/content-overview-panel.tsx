"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Link2, RefreshCw, Users, Eye, Heart } from "lucide-react"
import type { ContentHubOverview } from "./content-hub-types"
import { formatDistanceToNow } from "date-fns"

interface ContentOverviewPanelProps {
  overview: ContentHubOverview | null
  isLoading: boolean
  onGoPlatforms: () => void
  onSync: () => void
  isSyncing: boolean
}

export function ContentOverviewPanel({
  overview,
  isLoading,
  onGoPlatforms,
  onSync,
  isSyncing,
}: ContentOverviewPanelProps) {
  if (isLoading || !overview) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          Loading overview…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Connected platforms"
          value={`${overview.connectedCount}/${overview.platformCount}`}
          icon={Link2}
        />
        <StatCard
          label="Meta followers"
          value={overview.meta.followers.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Meta reach"
          value={overview.meta.reach.toLocaleString()}
          icon={Eye}
        />
        <StatCard
          label="Org post engagement"
          value={overview.orgPosts.engagement.toLocaleString()}
          icon={Heart}
          hint={`${overview.orgPosts.count} posts · ${overview.orgPosts.likes} likes`}
        />
      </div>

      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-white text-base">Sync health</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {overview.lastSync
                ? `Last sync ${formatDistanceToNow(new Date(overview.lastSync), { addSuffix: true })}`
                : "No analytics sync yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={onGoPlatforms}
            >
              Manage platforms
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={onSync}
              disabled={isSyncing || overview.connectedCount === 0}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
              Sync now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.attention.length === 0 ? (
            <p className="text-sm text-slate-400">All connected platforms look healthy.</p>
          ) : (
            overview.attention.map((item, index) => (
              <div
                key={`${item.type}-${item.platform || "all"}-${index}`}
                className="flex items-start gap-2 rounded-sm border border-slate-700/50 bg-slate-800/40 px-3 py-2"
              >
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{item.message}</p>
                  {item.platform && (
                    <Badge className="mt-1 text-[10px] bg-slate-700/60 text-slate-300 border-slate-600">
                      {item.platform}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: string
  icon: typeof Link2
  hint?: string
}) {
  return (
    <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">{label}</span>
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}
