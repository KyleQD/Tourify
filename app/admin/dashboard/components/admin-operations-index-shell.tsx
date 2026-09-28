"use client"

import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminEmptyState } from "./admin-empty-state"
import { AdminErrorCard } from "./admin-error-card"
import { AdminPageHeader } from "./admin-page-header"
import { AdminPageSkeleton } from "./admin-page-skeleton"
import { AdminStatCard } from "./admin-stat-card"
import type { AttentionIssueDTO } from "@/lib/admin/admin-operations-contracts"

export interface AdminOperationsSummaryCard {
  title: string
  value: string | number
  icon: LucideIcon
  color?: string
  subtitle?: string
  onClick?: () => void
}

export function AdminOperationsIndexShell({
  title,
  subtitle,
  icon,
  actions,
  isActingReady,
  summaryCards,
  attention,
  filterBar,
  isLoading,
  error,
  onRetry,
  empty,
  children,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  actions?: React.ReactNode
  isActingReady: boolean
  summaryCards: AdminOperationsSummaryCard[]
  attention?: AttentionIssueDTO[]
  filterBar?: React.ReactNode
  isLoading: boolean
  error?: string | null
  onRetry?: () => void
  empty?: {
    icon: LucideIcon
    title: string
    description: string
    action?: { label: string; href?: string; onClick?: () => void }
  } | null
  children: React.ReactNode
}) {
  if (!isActingReady) {
    return (
      <AdminEmptyState
        icon={Building2}
        title="No organization selected"
        description="Select an organization from the account switcher in the top navigation to continue."
      />
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <AdminPageHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />

      {summaryCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const stat = (
              <AdminStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                subtitle={card.subtitle}
                isLoading={isLoading}
              />
            )
            if (!card.onClick) return stat
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className="block rounded-sm text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                {stat}
              </button>
            )
          })}
        </div>
      ) : null}

      {attention?.length ? (
        <div className="rounded-sm border border-amber-400/25 bg-amber-400/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-amber-100">Needs Attention</p>
                <p className="text-xs text-slate-400">
                  {attention.length} item{attention.length === 1 ? "" : "s"} need review in this view.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {attention.slice(0, 3).map((issue) => (
                <Button
                  key={issue.id}
                  asChild={Boolean(issue.sourceUrl)}
                  size="sm"
                  variant="outline"
                  className="border-amber-400/30 text-amber-100 hover:bg-amber-400/10"
                >
                  {issue.sourceUrl ? (
                    <a href={issue.sourceUrl}>{issue.title}</a>
                  ) : (
                    <span>{issue.title}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {filterBar}

      {isLoading ? (
        <AdminPageSkeleton />
      ) : error ? (
        <AdminErrorCard title="Could not load this view" message={error} onRetry={onRetry} />
      ) : empty ? (
        <AdminEmptyState {...empty} />
      ) : (
        children
      )}
    </div>
  )
}
