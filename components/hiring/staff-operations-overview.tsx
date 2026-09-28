"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
  Users,
} from "lucide-react"

import { AdminErrorCard } from "@/app/admin/dashboard/components/admin-error-card"
import { AdminPageSkeleton } from "@/app/admin/dashboard/components/admin-page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useActingContext } from "@/hooks/use-acting-context"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { isWorkforceNotificationType } from "@/lib/notifications/workforce-notification-types"
import { serializeHiringEntity } from "@/types/hiring-entity"
import type { HiringEntity } from "@/types/hiring-entity"
import type {
  StaffOperationsPriority,
  StaffOperationsSummary,
  StaffOperationsTask,
} from "@/types/staff-operations"
import { WorkforceEmptyState, WorkforceMetricCard, WorkforcePanel } from "./workforce-ui"

interface StaffOperationsOverviewProps {
  employer: HiringEntity
  onOpenChannels: () => void
}

const PRIORITY_CLASS: Record<StaffOperationsPriority, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  normal: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  low: "border-slate-600 bg-slate-800/70 text-slate-300",
}

function notificationHref(notification: Notification): string | null {
  const link = notification.metadata?.link
  return typeof link === "string" && link.startsWith("/") ? link : null
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return "Recently"
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function TaskRow({ task }: { task: StaffOperationsTask }) {
  return (
    <Link
      href={task.actionHref}
      className="group flex items-start gap-3 rounded-sm border border-slate-700/50 bg-slate-900/55 p-3 transition-colors hover:border-purple-500/40 hover:bg-slate-800/60"
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border ${PRIORITY_CLASS[task.priority]}`}>
        {task.source === "scheduling" ? <CalendarClock className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{task.title}</span>
          <Badge className={`border text-[10px] ${PRIORITY_CLASS[task.priority]}`}>{task.priority}</Badge>
          {task.isOverdue ? <Badge className="bg-red-500/15 text-red-300">Overdue</Badge> : null}
        </span>
        {task.description ? <span className="mt-1 block line-clamp-2 text-xs text-slate-400">{task.description}</span> : null}
        <span className="mt-1.5 block text-[11px] text-slate-500">
          {task.kind.replaceAll("_", " ")}
          {task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString()}` : ""}
        </span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-purple-300" />
    </Link>
  )
}

export function StaffOperationsOverview({ employer, onOpenChannels }: StaffOperationsOverviewProps) {
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [summary, setSummary] = useState<StaffOperationsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/staff-operations/summary", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load staff operations")
      setSummary(payload as StaffOperationsSummary)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load staff operations")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void loadSummary()
  }, [actingContextKey, loadSummary])

  const workforceUpdates = useMemo(
    () => notifications.filter((notification) => isWorkforceNotificationType(notification.type)).slice(0, 8),
    [notifications],
  )
  const workforceUnread = workforceUpdates.filter((notification) => !notification.is_read).length
  const schedulingHref = useMemo(() => {
    const params = serializeHiringEntity({ employer })
    params.set("tab", "scheduling")
    return `/admin/dashboard/staff?${params.toString()}`
  }, [employer])

  if (loading && !summary) return <AdminPageSkeleton />
  if (error && !summary) return <AdminErrorCard title="Staff operations unavailable" message={error} onRetry={() => void loadSummary()} />
  if (!summary) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <WorkforceMetricCard label="Active staff" value={summary.metrics.activeStaff} description={`${summary.team.onLeave} on leave`} icon={Users} accent="cyan" />
        <WorkforceMetricCard label="Next 7 days" value={summary.metrics.shiftsNextSevenDays} description="Scheduled shifts" icon={CalendarClock} accent="purple" href={schedulingHref} />
        <WorkforceMetricCard label="Open shifts" value={summary.metrics.openShifts} description={`${summary.metrics.openConflicts} conflicts`} icon={ShieldAlert} accent="amber" href={`${schedulingHref}&view=open`} />
        <WorkforceMetricCard label="Pending updates" value={workforceUnread || summary.metrics.pendingRequests} description={`${unreadCount} total unread`} icon={MessageSquare} accent="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <WorkforcePanel className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Top tasks</h2>
              <p className="text-xs text-slate-400">Highest-priority work across crew, shifts, requests, and event operations.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadSummary()} className="text-slate-300">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          {summary.topTasks.length === 0 ? (
            <WorkforceEmptyState icon={CheckCheck} title="Operations are caught up" description={`No urgent workforce tasks are waiting for ${employer.displayName}.`} className="min-h-[260px]" />
          ) : (
            <div className="space-y-2">{summary.topTasks.map((task) => <TaskRow key={task.id} task={task} />)}</div>
          )}
        </WorkforcePanel>

        <WorkforcePanel className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Live updates</h2>
                {workforceUnread > 0 ? <Badge className="bg-blue-500/20 text-blue-300">{workforceUnread} unread</Badge> : null}
              </div>
              <p className="text-xs text-slate-400">Task, shift, and workforce request activity.</p>
            </div>
            {workforceUnread > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => void markAllAsRead()} className="px-2 text-xs text-slate-300">Mark read</Button>
            ) : null}
          </div>
          {workforceUpdates.length === 0 ? (
            <WorkforceEmptyState icon={Clock3} title="No workforce updates" description="Completed tasks, shift responses, and staff requests will appear here." className="min-h-[260px]" />
          ) : (
            <div className="space-y-1">
              {workforceUpdates.map((notification) => {
                const href = notificationHref(notification)
                const row = (
                  <div className={`rounded-sm border p-3 transition-colors ${notification.is_read ? "border-slate-800 bg-slate-900/35" : "border-blue-500/25 bg-blue-500/5"}`}>
                    <div className="flex items-start gap-2">
                      {!notification.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{notification.content}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{formatRelativeTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
                return href ? (
                  <Link key={notification.id} href={href} onClick={() => !notification.is_read && void markAsRead(notification.id)}>{row}</Link>
                ) : (
                  <button key={notification.id} type="button" className="block w-full text-left" onClick={() => !notification.is_read && void markAsRead(notification.id)}>{row}</button>
                )
              })}
            </div>
          )}
        </WorkforcePanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WorkforcePanel className="p-4">
          <div className="mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-purple-300" /><h3 className="text-sm font-semibold text-white">Upcoming schedule</h3></div>
          {summary.upcomingShifts.length === 0 ? <p className="text-sm text-slate-400">No upcoming shifts scheduled.</p> : (
            <div className="space-y-2">{summary.upcomingShifts.slice(0, 4).map((shift) => (
              <div key={shift.id} className="flex items-center justify-between gap-3 rounded-sm bg-slate-900/55 px-3 py-2">
                <div><p className="text-xs font-medium text-white">{shift.role || "Staff shift"}</p><p className="text-[11px] text-slate-500">{new Date(`${shift.shiftDate}T00:00:00`).toLocaleDateString()} · {shift.startTime || "TBD"}</p></div>
                <Badge className={shift.isOpen ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>{shift.isOpen ? "Open" : shift.status}</Badge>
              </div>
            ))}</div>
          )}
        </WorkforcePanel>

        <WorkforcePanel className="p-4">
          <div className="mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-semibold text-white">Coverage health</h3></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-sm bg-slate-900/55 p-3"><p className="text-xl font-semibold text-emerald-300">{summary.coverage.filledShifts}</p><p className="text-[10px] text-slate-500">Filled</p></div>
            <div className="rounded-sm bg-slate-900/55 p-3"><p className="text-xl font-semibold text-amber-300">{summary.coverage.openShifts}</p><p className="text-[10px] text-slate-500">Open</p></div>
            <div className="rounded-sm bg-slate-900/55 p-3"><p className="text-xl font-semibold text-red-300">{summary.coverage.openConflicts}</p><p className="text-[10px] text-slate-500">Conflicts</p></div>
          </div>
        </WorkforcePanel>

        <WorkforcePanel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">Active team</h3></span><Button variant="ghost" size="sm" onClick={onOpenChannels} className="h-7 px-2 text-xs text-cyan-300">Message</Button></div>
          <div className="flex items-center justify-between rounded-sm bg-slate-900/55 p-3"><div><p className="text-2xl font-semibold text-white">{summary.team.active}</p><p className="text-xs text-slate-500">Approved active members</p></div>{summary.team.pending > 0 ? <Badge className="bg-amber-500/15 text-amber-300">{summary.team.pending} pending</Badge> : <CheckCheck className="h-5 w-5 text-emerald-400" />}</div>
        </WorkforcePanel>
      </div>

      {summary.unavailableSources?.length ? (
        <div className="flex items-center gap-2 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Some sources are unavailable: {summary.unavailableSources.join(", ")}</div>
      ) : null}
    </div>
  )
}
