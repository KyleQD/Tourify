"use client";

/**
 * Event Workspace Navigation
 *
 * Grouped primary + secondary navigation for Event detail pages.
 * Reduces 13 flat tabs to 5 primary groups.
 * Fixes: AUX-EVT-009
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EVENT_WORKSPACE_GROUPS,
  type EventWorkspaceGroup,
  type EventOpsTab,
} from "@/lib/admin/event-ops-tabs";

interface EventWorkspaceNavProps {
  activeTab: EventOpsTab;
  onTabChange: (tab: EventOpsTab) => void;
  className?: string;
}

export function EventWorkspaceNav({
  activeTab,
  onTabChange,
  className,
}: EventWorkspaceNavProps) {
  return (
    <nav
      className={cn(
        "flex items-center gap-1 overflow-x-auto px-4 py-2 border-b",
        className
      )}
      role="tablist"
      aria-label="Event workspace sections"
    >
      {EVENT_WORKSPACE_GROUPS.map((group) => {
        const hasSecondary = group.secondary.length > 0;
        const isGroupActive = isGroupSelected(group, activeTab);

        if (hasSecondary) {
          return (
            <GroupedTab
              key={group.id}
              group={group}
              activeTab={activeTab}
              onSelect={onTabChange}
              isGroupActive={isGroupActive}
            />
          );
        }

        return (
          <TabButton
            key={group.id}
            label={group.label}
            isActive={activeTab === group.primaryTab}
            onClick={() => onTabChange(group.primaryTab)}
          />
        );
      })}
    </nav>
  );
}

// ─── Grouped Tab ─────────────────────────────────────────────────────

interface GroupedTabProps {
  group: EventWorkspaceGroup;
  activeTab: EventOpsTab;
  onSelect: (tab: EventOpsTab) => void;
  isGroupActive: boolean;
}

function GroupedTab({
  group,
  activeTab,
  onSelect,
  isGroupActive,
}: GroupedTabProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Find the active secondary item
  const activeSecondary = group.secondary.find((s) => s.id === activeTab);
  const displayLabel = activeSecondary?.label ?? group.label;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
            isGroupActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          role="tab"
          aria-selected={isGroupActive}
          aria-expanded={isOpen}
        >
          {displayLabel}
          {activeSecondary && (
            <span className="text-xs text-muted-foreground ml-1">
              — {activeSecondary.label}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {/* Primary item */}
        <DropdownMenuItem
          onClick={() => {
            onSelect(group.primaryTab);
            setIsOpen(false);
          }}
          className={cn(
            "font-medium",
            activeTab === group.primaryTab && "bg-primary/10"
          )}
        >
          {group.label}
        </DropdownMenuItem>

        {/* Secondary items */}
        {group.secondary.map((secondary) => (
          <DropdownMenuItem
            key={secondary.id}
            onClick={() => {
              onSelect(secondary.id);
              setIsOpen(false);
            }}
            className={cn(
              activeTab === secondary.id && "bg-primary/10"
            )}
          >
            {secondary.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Simple Tab Button ───────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isGroupSelected(
  group: EventWorkspaceGroup,
  activeTab: EventOpsTab
): boolean {
  if (group.primaryTab === activeTab) return true;
  return group.secondary.some((s) => s.id === activeTab);
}
