"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WorkforceHero, WorkforcePanel } from "@/components/hiring/workforce-ui"
import { cn } from "@/lib/utils"

export interface OperationsTab {
  value: string
  label: string
  icon: LucideIcon
}

export interface OperationsTabGroup {
  id: string
  label: string
  icon: LucideIcon
  primaryTab: string
  secondary: Array<{ id: string; label: string }>
}

interface OperationsCommandShellProps {
  eyebrow?: string
  title: string
  description: string
  badge?: string
  actions?: React.ReactNode
  tabs: OperationsTab[]
  /** Grouped tabs — if provided, renders grouped navigation instead of flat tabs */
  tabGroups?: OperationsTabGroup[]
  activeTab: string
  onTabChange: (value: string) => void
  children: React.ReactNode
  metrics?: React.ReactNode
  className?: string
  tabColsClassName?: string
  /** When false, skips WorkforceHero but keeps actions toolbar + tabs. Default true. */
  showHero?: boolean
}

export function OperationsCommandShell({
  eyebrow = "Operations",
  title,
  description,
  badge,
  actions,
  tabs,
  tabGroups,
  activeTab,
  onTabChange,
  children,
  metrics,
  className,
  tabColsClassName,
  showHero = true,
}: OperationsCommandShellProps) {
  const cols =
    tabColsClassName ||
    (tabs.length <= 4
      ? "md:grid-cols-4"
      : tabs.length <= 7
        ? "md:grid-cols-4 xl:grid-cols-7"
        : "md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7")

  return (
    <section className={cn("space-y-6", className)}>
      {showHero ? (
        <WorkforceHero
          eyebrow={eyebrow}
          title={title}
          description={description}
          badge={badge}
          actions={actions}
        />
      ) : actions ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {actions}
        </div>
      ) : null}

      {metrics ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics}</div> : null}

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        {tabGroups && tabGroups.length > 0 ? (
          <WorkforcePanel className="p-2">
            <GroupedTabsList
              groups={tabGroups}
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </WorkforcePanel>
        ) : (
          <WorkforcePanel className="p-2">
            <TabsList
              className={cn(
                "grid h-auto w-full grid-cols-2 gap-2 rounded-[1.15rem] bg-slate-900/70 p-1",
                cols
              )}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-2 rounded-xl border border-transparent text-slate-300 data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-white"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </WorkforcePanel>
        )}

        {children}
      </Tabs>
    </section>
  )
}

export function OperationsPanelLoading() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/40 text-sm text-slate-400">
      Loading panel…
    </div>
  )
}

export function OperationsTabPanel({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <TabsContent value={value} className={cn("space-y-6 outline-none", className)}>
      {children}
    </TabsContent>
  )
}

// ─── Grouped Tabs List ───────────────────────────────────────────────

interface GroupedTabsListProps {
  groups: OperationsTabGroup[]
  activeTab: string
  onTabChange: (value: string) => void
}

function GroupedTabsList({ groups, activeTab, onTabChange }: GroupedTabsListProps) {
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto px-2 py-1"
      role="tablist"
      aria-label="Workspace sections"
    >
      {groups.map((group) => {
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
  group: OperationsTabGroup
  activeTab: string
  onSelect: (tab: string) => void
  isGroupActive: boolean
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
              ? "bg-cyan-400/10 text-white border border-cyan-400/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/50"
          )}
          role="tab"
          aria-selected={isGroupActive}
          aria-expanded={isOpen}
        >
          <group.icon className="h-4 w-4 shrink-0" />
          {displayLabel}
          {activeSecondary && (
            <span className="text-xs text-slate-400 ml-1">
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
      <DropdownMenuContent align="start" className="min-w-[180px] bg-slate-800 border-slate-700">
        {/* Primary item */}
        <DropdownMenuItem
          onClick={() => {
            onSelect(group.primaryTab);
            setIsOpen(false);
          }}
          className={cn(
            "font-medium text-slate-200",
            activeTab === group.primaryTab && "bg-cyan-400/10 text-white"
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
              "text-slate-200",
              activeTab === secondary.id && "bg-cyan-400/10 text-white"
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
  label: string
  isActive: boolean
  onClick: () => void
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-cyan-400/10 text-white border border-cyan-400/30"
          : "text-slate-300 hover:text-white hover:bg-slate-800/50"
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

function isGroupSelected(group: OperationsTabGroup, activeTab: string): boolean {
  if (group.primaryTab === activeTab) return true;
  return group.secondary.some((s) => s.id === activeTab);
}
