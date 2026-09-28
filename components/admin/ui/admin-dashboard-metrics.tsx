"use client";

/**
 * Admin Dashboard Metrics
 *
 * Replaces AdminStatCard with AdminMetricStateRenderer.
 * Shows scope label, coverage indicator, and freshness.
 * Fixes: AUX-DASH-005, AUX-STATE-001, AUX-STATE-003
 */

import { Card, CardContent } from "@/components/ui/card";
import { AdminMetricStateRenderer } from "@/components/admin/states/admin-data-state-renderer";
import { Globe, Calendar, DollarSign, Users, Truck } from "lucide-react";
import { formatSafeCurrency } from "@/lib/format/number-format";
import type { AdminDashboardStats } from "@/types/admin";

interface AdminDashboardMetricsProps {
  stats: AdminDashboardStats | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function AdminDashboardMetrics({
  stats,
  isLoading,
  error,
  onRetry,
}: AdminDashboardMetricsProps) {
  const metrics = [
    {
      key: "tours",
      label: "Total Tours",
      icon: Globe,
      value: stats?.totalTours ?? 0,
      scope: "organization",
      coverage: "full" as const,
    },
    {
      key: "events",
      label: "Total Events",
      icon: Calendar,
      value: stats?.totalEvents ?? 0,
      scope: "organization",
      coverage: "full" as const,
    },
    {
      key: "revenue",
      label: "Total Revenue",
      icon: DollarSign,
      value: stats?.totalRevenue ?? 0,
      scope: "organization",
      coverage: "full" as const,
      format: (v: number) => formatSafeCurrency(v),
    },
    {
      key: "tickets",
      label: "Tickets Sold",
      icon: Users,
      value: stats?.ticketsSold ?? 0,
      scope: "organization",
      coverage: "full" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.key}
          className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm"
        >
          <CardContent className="p-4">
            {isLoading ? (
              <AdminMetricStateRenderer
                state={{ status: "loading", label: metric.label }}
              />
            ) : error ? (
              <AdminMetricStateRenderer
                state={{
                  status: "unavailable",
                  label: metric.label,
                  reason: error,
                  retry: onRetry,
                }}
              />
            ) : (
              <AdminMetricStateRenderer
                state={{
                  status: "ready",
                  value: metric.value,
                  label: metric.label,
                  scope: metric.scope,
                  coverage: metric.coverage,
                }}
                format={metric.format}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Quick Integration Row (ops shortcuts) ───────────────────────────

interface AdminQuickLinksProps {
  stats: AdminDashboardStats | null;
  staffHref: string;
  hiringHref: string;
}

export function AdminQuickLinks({
  stats,
  staffHref,
  hiringHref,
}: AdminQuickLinksProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {/* Logistics */}
      <a href="/admin/dashboard/logistics" className="block">
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-colors cursor-pointer h-full">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-purple-500/20 rounded-sm shrink-0">
                <Truck className="h-4 w-4 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Logistics</p>
                <p className="text-xs text-slate-400 truncate">
                  {stats?.completedTasks || 0} completed /{" "}
                  {(stats?.completedTasks || 0) + (stats?.pendingTasks || 0)}{" "}
                  tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* Finances */}
      <a href="/admin/dashboard/finances" className="block">
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-green-500/30 transition-colors cursor-pointer h-full">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-green-500/20 rounded-sm shrink-0">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Finances</p>
                <p className="text-xs text-slate-400 truncate">
                  Monthly: {formatSafeCurrency(stats?.monthlyRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* Staff */}
      <a href={staffHref} className="block">
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/30 transition-colors cursor-pointer h-full">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-blue-500/20 rounded-sm shrink-0">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Staff & Crew</p>
                <p className="text-xs text-slate-400 truncate">
                  {stats?.staffMembers || 0} team members
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* Hiring */}
      <a href={hiringHref} className="block">
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-cyan-500/30 transition-colors cursor-pointer h-full">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-cyan-500/20 rounded-sm shrink-0">
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Hiring Hub</p>
                <p className="text-xs text-slate-400 truncate">
                  Jobs, applicants, onboarding
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* Communications */}
      <a href="/admin/dashboard/communications" className="block">
        <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors cursor-pointer h-full">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-amber-500/20 rounded-sm shrink-0">
                <Calendar className="h-4 w-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Communications</p>
                <p className="text-xs text-slate-400 truncate">
                  Inbox and crew threads
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>
    </div>
  );
}
