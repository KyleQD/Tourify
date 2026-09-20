"use client";

/**
 * Admin Workspace Navigation
 *
 * Replaces monolithic tab walls with grouped primary + secondary navigation.
 * Fixes: AUX-EVT-009, AUX-TOUR-012, AUX-ORG-001, AUX-TIX-001,
 *        AUX-HIRE-003, AUX-LOG-001, AUX-CMP-008
 *
 * Renders as:
 *  - Desktop: horizontal tab bar with dropdown sub-tabs
 *  - Mobile: bottom-aligned segmented control / sheet
 */

import * as React from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type WorkspaceNavItem,
} from "@/lib/admin/navigation/admin-navigation-model";
import { useAdminUrlState } from "@/lib/admin/navigation/admin-route-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── WorkspaceNav ────────────────────────────────────────────────────

interface WorkspaceNavProps {
  items: WorkspaceNavItem[];
  /** Base path for the workspace (e.g., "/admin/dashboard/events") */
  basePath: string;
  /** Additional content to render after tabs */
  actions?: React.ReactNode;
  /** Currently selected record count for badge */
  selectedCount?: number;
  className?: string;
}

export function WorkspaceNav({
  items,
  basePath,
  actions,
  selectedCount,
  className,
}: WorkspaceNavProps) {
  const { state, setTab } = useAdminUrlState();
  const currentTab = state.tab ?? "overview";

  const primaryItems = items;
  const activeItem = findActiveItem(items, currentTab);

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b bg-background",
        className
      )}
    >
      {/* Primary Navigation */}
      <nav
        className="flex items-center gap-1 overflow-x-auto px-4 py-2"
        role="tablist"
        aria-label="Workspace sections"
      >
        {primaryItems.map((item) => {
          const isActive = isItemActive(item, currentTab);
          const hasSecondary = item.secondary && item.secondary.length > 0;

          if (hasSecondary) {
            return (
              <GroupedTab
                key={item.id}
                item={item}
                currentTab={currentTab}
                onSelect={(tabId) => setTab(tabId)}
              />
            );
          }

          return (
            <TabButton
              key={item.id}
              label={item.label}
              isActive={isActive}
              onClick={() => setTab(item.id)}
            />
          );
        })}
      </nav>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 px-4">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Grouped Tab (Primary with Secondary) ────────────────────────────

interface GroupedTabProps {
  item: WorkspaceNavItem;
  currentTab: string;
  onSelect: (tabId: string) => void;
}

function GroupedTab({ item, currentTab, onSelect }: GroupedTabProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isGroupActive = isItemActive(item, currentTab);

  // Find the active secondary item
  const activeSecondary = item.secondary?.find(
    (s) => s.id === currentTab
  );
  const displayLabel = activeSecondary?.label ?? item.label;

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
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {/* Primary item */}
        <DropdownMenuItem
          onClick={() => {
            onSelect(item.id);
            setIsOpen(false);
          }}
          className={cn(
            "font-medium",
            currentTab === item.id && "bg-primary/10"
          )}
        >
          {item.label}
        </DropdownMenuItem>

        {/* Secondary items */}
        {item.secondary?.map((secondary) => (
          <DropdownMenuItem
            key={secondary.id}
            onClick={() => {
              onSelect(secondary.id);
              setIsOpen(false);
            }}
            className={cn(
              currentTab === secondary.id && "bg-primary/10"
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
  badge?: number;
}

function TabButton({ label, isActive, onClick, badge }: TabButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-normal">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Button>
  );
}

// ─── Mobile Workspace Nav ────────────────────────────────────────────

interface MobileWorkspaceNavProps {
  items: WorkspaceNavItem[];
  basePath: string;
  className?: string;
}

export function MobileWorkspaceNav({
  items,
  basePath,
  className,
}: MobileWorkspaceNavProps) {
  const { state, setTab } = useAdminUrlState();
  const currentTab = state.tab ?? "overview";

  return (
    <div className={cn("lg:hidden", className)}>
      <div className="border-b bg-background px-4 py-2">
        <Select
          value={currentTab}
          onValueChange={setTab}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Secondary items as horizontal scroll on mobile */}
      {(() => {
        const activeItem = findActiveItem(items, currentTab);
        if (!activeItem?.secondary) return null;

        return (
          <div className="flex gap-1 overflow-x-auto border-b px-4 py-1.5">
            {activeItem.secondary.map((sub) => (
              <Button
                key={sub.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "whitespace-nowrap text-xs",
                  currentTab === sub.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
                onClick={() => setTab(sub.id)}
              >
                {sub.label}
              </Button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function findActiveItem(
  items: WorkspaceNavItem[],
  currentTab: string
): WorkspaceNavItem | undefined {
  // Check primary items
  const primary = items.find((i) => i.id === currentTab);
  if (primary) return primary;

  // Check secondary items
  for (const item of items) {
    if (item.secondary?.some((s) => s.id === currentTab)) {
      return item;
    }
  }

  return undefined;
}

function isItemActive(item: WorkspaceNavItem, currentTab: string): boolean {
  if (item.id === currentTab) return true;
  return item.secondary?.some((s) => s.id === currentTab) ?? false;
}
