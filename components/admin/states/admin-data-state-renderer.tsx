"use client";

/**
 * Admin Data State Renderer
 *
 * Renders the appropriate UI for each AdminDataState.
 * Fixes: AUX-STATE-001, AUX-CMP-002, AUX-STATE-003
 *
 * Usage:
 *   <AdminDataStateRenderer state={dataState} onRetry={handleRetry}>
 *     {(data) => <ActualContent data={data} />}
 *   </AdminDataStateRenderer>
 */

import * as React from "react";
import { AlertCircle, RefreshCw, Shield, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AdminDataState,
  type AdminFreshness,
  isLoading,
  isReady,
  isTrueEmpty,
  isFilteredEmpty,
  isStale,
  isDegraded,
  isDenied,
  isUnavailable,
  hasData,
  formatFreshness,
} from "@/lib/admin/data/admin-data-state";

// ─── Props ───────────────────────────────────────────────────────────

interface AdminDataStateRendererProps<T> {
  state: AdminDataState<T>;
  onRetry?: () => void;
  loadingSkeleton?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  children: (data: T) => React.ReactNode;
}

// ─── Main Renderer ───────────────────────────────────────────────────

export function AdminDataStateRenderer<T>({
  state,
  onRetry,
  loadingSkeleton,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
  children,
}: AdminDataStateRendererProps<T>) {
  if (isLoading(state)) {
    return <>{loadingSkeleton ?? <AdminLoadingSkeleton />}</>;
  }

  if (isDenied(state)) {
    return (
      <AdminDeniedState
        reason={state.reason}
        requiredCapability={state.requiredCapability}
        className={className}
      />
    );
  }

  if (isUnavailable(state)) {
    return (
      <AdminUnavailableState
        error={state.error}
        retryable={state.retryable}
        onRetry={onRetry ?? state.retry}
        className={className}
      />
    );
  }

  if (isTrueEmpty(state)) {
    return (
      <AdminEmptyState
        title={emptyTitle ?? "No records"}
        description={emptyDescription ?? "There are no items to display."}
        action={emptyAction}
        freshness={state.freshness}
        className={className}
      />
    );
  }

  if (isFilteredEmpty(state)) {
    return (
      <AdminFilteredEmptyState
        title={emptyTitle ?? "No matching records"}
        description={emptyDescription ?? "Try adjusting your filters or search."}
        freshness={state.freshness}
        className={className}
      />
    );
  }

  // For ready, stale, and degraded — render children if data is available
  if (hasData(state)) {
    return (
      <div className={className}>
        {(isStale(state) || isDegraded(state)) && (
          <AdminFreshnessIndicator
            state={state.status === "stale" ? "stale" : state.status === "degraded" ? "partial" : "live"}
            freshness={state.freshness}
            unavailableSources={isDegraded(state) ? state.unavailableSources : undefined}
          />
        )}
        {children(state.data)}
      </div>
    );
  }

  // Fallback — should not reach here with proper state management
  return null;
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function AdminLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-8 w-[60px]" />
            <Skeleton className="h-3 w-[140px]" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Denied State ────────────────────────────────────────────────────

function AdminDeniedState({
  reason,
  requiredCapability,
  className,
}: {
  reason?: string;
  requiredCapability?: string;
  className?: string;
}) {
  return (
    <Card className={`p-8 text-center ${className ?? ""}`}>
      <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {reason ?? "You do not have permission to access this resource."}
      </p>
      {requiredCapability && (
        <p className="text-xs text-muted-foreground">
          Required capability: <code className="bg-muted px-1.5 py-0.5 rounded">{requiredCapability}</code>
        </p>
      )}
    </Card>
  );
}

// ─── Unavailable State ───────────────────────────────────────────────

function AdminUnavailableState({
  error,
  retryable,
  onRetry,
  className,
}: {
  error?: string;
  retryable?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={`p-8 text-center ${className ?? ""}`}>
      <WifiOff className="h-10 w-10 mx-auto text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Data Unavailable</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {error ?? "Unable to load data. This may be a temporary issue."}
      </p>
      {retryable && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function AdminEmptyState({
  title,
  description,
  action,
  freshness,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  freshness?: AdminFreshness;
  className?: string;
}) {
  return (
    <Card className={`p-8 text-center ${className ?? ""}`}>
      <div className="h-10 w-10 mx-auto text-muted-foreground mb-4 rounded-full bg-muted flex items-center justify-center">
        <span className="text-lg">0</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {freshness && (
        <p className="text-xs text-muted-foreground mb-4">
          {formatFreshness(freshness)}
        </p>
      )}
      {action}
    </Card>
  );
}

// ─── Filtered Empty State ────────────────────────────────────────────

function AdminFilteredEmptyState({
  title,
  description,
  freshness,
  className,
}: {
  title: string;
  description: string;
  freshness?: AdminFreshness;
  className?: string;
}) {
  return (
    <Card className={`p-8 text-center ${className ?? ""}`}>
      <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {freshness && (
        <p className="text-xs text-muted-foreground">
          {formatFreshness(freshness)}
        </p>
      )}
    </Card>
  );
}

// ─── Freshness Indicator ─────────────────────────────────────────────

export function AdminFreshnessIndicator({
  state,
  freshness,
  unavailableSources,
  className,
}: {
  state: "live" | "updated" | "stale" | "partial" | "offline";
  freshness?: AdminFreshness;
  unavailableSources?: string[];
  className?: string;
}) {
  const config = {
    live: { color: "text-green-500", bg: "bg-green-500/10", icon: Wifi, label: "Live" },
    updated: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Wifi, label: formatFreshness(freshness) || "Updated" },
    stale: { color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle, label: "Stale data" },
    partial: { color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle, label: "Partial data" },
    offline: { color: "text-red-500", bg: "bg-red-500/10", icon: WifiOff, label: "Offline" },
  }[state];

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md ${config.bg} ${config.color} ${className ?? ""}`}
      role="status"
      aria-label={config.label}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      {unavailableSources && unavailableSources.length > 0 && (
        <span className="text-muted-foreground">
          — {unavailableSources.join(", ")} unavailable
        </span>
      )}
    </div>
  );
}

// ─── Metric State Renderer ───────────────────────────────────────────

interface AdminMetricStateRendererProps {
  state: {
    status: "loading" | "ready" | "unavailable" | "degraded";
    value?: number;
    label?: string;
    scope?: string;
    coverage?: "full" | "partial" | "page-only";
    unavailableSources?: string[];
    reason?: string;
    retry?: () => void;
  };
  format?: (value: number) => string;
  onRetry?: () => void;
  className?: string;
}

export function AdminMetricStateRenderer({
  state,
  format,
  onRetry,
  className,
}: AdminMetricStateRendererProps) {
  const formatValue = format ?? ((v: number) => v.toLocaleString());

  if (state.status === "loading") {
    return (
      <div className={`space-y-2 ${className ?? ""}`}>
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-8 w-[120px]" />
        {state.label && <Skeleton className="h-3 w-[100px]" />}
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className={`space-y-1 ${className ?? ""}`}>
        {state.label && (
          <p className="text-xs text-muted-foreground">{state.label}</p>
        )}
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">
            {state.reason ?? "Unavailable"}
          </span>
        </div>
        {state.retry && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onRetry ?? state.retry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (state.status === "degraded") {
    return (
      <div className={`space-y-1 ${className ?? ""}`}>
        {state.label && (
          <p className="text-xs text-muted-foreground">{state.label}</p>
        )}
        {state.value !== undefined ? (
          <p className="text-2xl font-bold text-amber-500">
            {formatValue(state.value)}
          </p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground">—</p>
        )}
        {state.unavailableSources && state.unavailableSources.length > 0 && (
          <p className="text-xs text-amber-500">
            Partial — {state.unavailableSources.join(", ")} unavailable
          </p>
        )}
      </div>
    );
  }

  // Ready state
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      {state.label && (
        <p className="text-xs text-muted-foreground">{state.label}</p>
      )}
      <p className="text-2xl font-bold">
        {state.value !== undefined ? formatValue(state.value) : "—"}
      </p>
      {state.scope && state.scope !== "organization" && (
        <p className="text-xs text-muted-foreground">{state.scope}</p>
      )}
      {state.coverage === "page-only" && (
        <p className="text-xs text-muted-foreground">Visible page only</p>
      )}
      {state.coverage === "partial" && (
        <p className="text-xs text-amber-500">Partial data</p>
      )}
    </div>
  );
}
