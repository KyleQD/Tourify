"use client";

/**
 * Admin Attention Panel
 *
 * Proactive attention center replacing buried Notifications center.
 * Fixes: AUX-ATTN-001, AUX-ATTN-002, AUX-ATTN-003, AUX-ATTN-004,
 *        AUX-ATTN-005, AUX-NOTIF-001, AUX-NOTIF-002, AUX-NOTIF-003,
 *        AUX-NOTIF-004
 *
 * Displays triaged, prioritized attention items with clear actions.
 */

import * as React from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  Info,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type AttentionItem,
  type AttentionCategory,
  type AttentionState,
  sortAttentionItems,
  getUnreadCount,
  groupByCategory,
  formatCategory,
  timeAgo,
  timeUntil,
} from "@/lib/admin/attention/admin-attention-types";

// ─── Attention Panel ─────────────────────────────────────────────────

interface AttentionPanelProps {
  state: AttentionState;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onAction?: (itemId: string, actionId: string) => void;
  className?: string;
}

export function AttentionPanel({
  state,
  onMarkAsRead,
  onMarkAllAsRead,
  onAction,
  className,
}: AttentionPanelProps) {
  const [filter, setFilter] = React.useState<AttentionCategory | "all">("all");

  if (state.status === "loading") {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Loading attention items...</span>
        </div>
      </Card>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="text-sm">Attention data unavailable</span>
        </div>
      </Card>
    );
  }

  const items = sortAttentionItems(state.items);
  const filteredItems = filter === "all"
    ? items
    : items.filter((item) => item.category === filter);
  const unreadCount = getUnreadCount(items);

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-medium">Attention</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b px-4 py-2 overflow-x-auto">
        <FilterButton
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
          count={items.length}
        />
        <FilterButton
          label="Approval"
          active={filter === "approval"}
          onClick={() => setFilter("approval")}
          count={items.filter((i) => i.category === "approval").length}
          icon={<AlertTriangle className="h-3 w-3" />}
        />
        <FilterButton
          label="Deadline"
          active={filter === "deadline"}
          onClick={() => setFilter("deadline")}
          count={items.filter((i) => i.category === "deadline").length}
          icon={<Clock className="h-3 w-3" />}
        />
        <FilterButton
          label="Error"
          active={filter === "error"}
          onClick={() => setFilter("error")}
          count={items.filter((i) => i.category === "error").length}
          icon={<AlertTriangle className="h-3 w-3 text-destructive" />}
        />
      </div>

      {/* Items List */}
      <ScrollArea className="max-h-[400px]">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? (
              <>
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All clear! No attention items.</p>
              </>
            ) : (
              <p>No items in this category.</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredItems.map((item) => (
              <AttentionItemRow
                key={item.id}
                item={item}
                onMarkAsRead={onMarkAsRead}
                onAction={onAction}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}

// ─── Attention Item Row ──────────────────────────────────────────────

interface AttentionItemRowProps {
  item: AttentionItem;
  onMarkAsRead?: (id: string) => void;
  onAction?: (itemId: string, actionId: string) => void;
}

function AttentionItemRow({ item, onMarkAsRead, onAction }: AttentionItemRowProps) {
  const categoryConfig = {
    approval: { icon: AlertTriangle, color: "text-amber-500" },
    deadline: { icon: Clock, color: "text-blue-500" },
    error: { icon: AlertTriangle, color: "text-destructive" },
    reminder: { icon: Info, color: "text-muted-foreground" },
    update: { icon: Info, color: "text-muted-foreground" },
  }[item.category];

  const Icon = categoryConfig.icon;

  return (
    <div
      className={cn(
        "flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
        !item.read && "bg-primary/5"
      )}
      onClick={() => onMarkAsRead?.(item.id)}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 shrink-0", categoryConfig.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-sm font-medium truncate",
            !item.read && "font-semibold"
          )}>
            {item.title}
          </p>
          {item.priority === "high" && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px] shrink-0">
              Urgent
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{timeAgo(item.createdAt)}</span>
          {item.deadline && (
            <>
              <span>·</span>
              <span className="text-amber-500">{timeUntil(item.deadline)}</span>
            </>
          )}
          <span>·</span>
          <span>{item.domain}</span>
        </div>

        {/* Actions */}
        {item.actions && item.actions.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {item.actions.map((action) => (
              <Button
                key={action.id}
                variant={action.primary ? "default" : (action.variant ?? "outline")}
                size="sm"
                className="h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (action.href) {
                    window.location.href = action.href;
                  }
                  onAction?.(item.id, action.id);
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Link */}
      <a
        href={item.href}
        className="shrink-0 self-center text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}

// ─── Filter Button ───────────────────────────────────────────────────

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: React.ReactNode;
}

function FilterButton({ label, active, onClick, count, icon }: FilterButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 text-xs gap-1",
        active && "bg-primary/10 text-primary"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground">({count})</span>
      )}
    </Button>
  );
}

// ─── Attention Badge (Header Icon) ───────────────────────────────────

interface AttentionBadgeProps {
  count: number;
  className?: string;
}

export function AttentionBadge({ count, className }: AttentionBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center px-1",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
