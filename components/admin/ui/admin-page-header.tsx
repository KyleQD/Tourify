"use client";

/**
 * Admin Page Header
 *
 * Standardized page header with title, subtitle, and actions slot.
 * Replaces duplicated header markup across all admin pages.
 * Fixes: AUX-CMP-001, AUX-IA-008
 */

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "destructive" | "outline" }>;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  icon,
  backHref,
  backLabel = "Back",
  actions,
  badges,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-8 w-8 shrink-0"
            asChild
          >
            <a href={backHref} aria-label={backLabel}>
              <ChevronLeft className="h-4 w-4" />
            </a>
          </Button>
        )}
        {icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {badges?.map((badge, i) => (
              <Badge key={i} variant={badge.variant ?? "secondary"} className="text-xs">
                {badge.label}
              </Badge>
            ))}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────

interface AdminSectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AdminSectionHeader({
  title,
  description,
  action,
  className,
}: AdminSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
