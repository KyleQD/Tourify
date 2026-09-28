"use client";

/**
 * Admin Empty State
 *
 * Consistent empty state component across all Admin pages.
 * Fixes: AUX-CMP-002, AUX-STATE-001
 *
 * Rules:
 * - Shows scope label for org-scoped data
 * - Shows why data may be empty (not just "no records")
 * - Provides actionable next steps
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Empty State Types ───────────────────────────────────────────────

type EmptyStateType =
  | "no-records"      // Collection has no items
  | "filtered-empty"  // Filters returned no results
  | "no-data"         // Data source unavailable or not connected
  | "no-access";      // User lacks required permission

interface AdminEmptyStateProps {
  type: EmptyStateType;
  title: string;
  description?: string;
  /** Scope context label (e.g., "for Summer 2026 Tour") */
  scopeLabel?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Optional illustration/icon override */
  icon?: React.ReactNode;
  className?: string;
}

export function AdminEmptyState({
  type,
  title,
  description,
  scopeLabel,
  action,
  secondaryAction,
  icon,
  className,
}: AdminEmptyStateProps) {
  const defaultIcons: Record<EmptyStateType, React.ReactNode> = {
    "no-records": <EmptyRecordsIcon />,
    "filtered-empty": <FilteredEmptyIcon />,
    "no-data": <NoDataIcon />,
    "no-access": <NoAccessIcon />,
  };

  const displayIcon = icon ?? defaultIcons[type];

  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "border-dashed",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        {displayIcon}
      </div>

      <h3 className="text-lg font-semibold mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-1">
          {description}
        </p>
      )}

      {scopeLabel && (
        <p className="text-xs text-muted-foreground mb-4">
          {scopeLabel}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2">
        {action?.href ? (
          <Button asChild>
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : action?.onClick ? (
          <Button onClick={action.onClick}>{action.label}</Button>
        ) : null}

        {secondaryAction?.href ? (
          <Button variant="outline" asChild>
            <a href={secondaryAction.href}>{secondaryAction.label}</a>
          </Button>
        ) : secondaryAction?.onClick ? (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

// ─── Compact Empty State (for inline use) ────────────────────────────

interface AdminCompactEmptyProps {
  message: string;
  scopeLabel?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function AdminCompactEmpty({
  message,
  scopeLabel,
  action,
  className,
}: AdminCompactEmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-6 text-center", className)}>
      <p className="text-sm text-muted-foreground mb-2">{message}</p>
      {scopeLabel && (
        <p className="text-xs text-muted-foreground mb-3">{scopeLabel}</p>
      )}
      {action?.onClick && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {action?.href && (
        <Button variant="outline" size="sm" asChild>
          <a href={action.href}>{action.label}</a>
        </Button>
      )}
    </div>
  );
}

// ─── Loading State ───────────────────────────────────────────────────

interface AdminLoadingProps {
  rows?: number;
  className?: string;
}

export function AdminLoading({ rows = 5, className }: AdminLoadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
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
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Icon Components ─────────────────────────────────────────────────

function EmptyRecordsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function FilteredEmptyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function NoDataIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function NoAccessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
