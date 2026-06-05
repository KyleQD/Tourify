"use client"

import { Search, LayoutGrid, LayoutList } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StatusOption {
  value: string
  label: string
}

interface AdminFilterBarProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  statusOptions?: StatusOption[]
  statusValue?: string
  onStatusChange?: (value: string) => void
  viewMode?: "list" | "grid"
  onViewModeChange?: (mode: "list" | "grid") => void
  /** Extra buttons or elements on the right side */
  actions?: React.ReactNode
}

export function AdminFilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  statusOptions,
  statusValue,
  onStatusChange,
  viewMode,
  onViewModeChange,
  actions,
}: AdminFilterBarProps) {
  return (
    <div className="bg-slate-900/40 border border-slate-700/50 rounded-sm p-4 flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400 text-sm"
        />
      </div>

      {/* Status filter */}
      {statusOptions && statusOptions.length > 0 && onStatusChange && (
        <Select value={statusValue} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-[160px] bg-slate-800/50 border-slate-700/50 text-white text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
            {statusOptions.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="focus:bg-slate-800 focus:text-white"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* View mode toggle */}
      {viewMode !== undefined && onViewModeChange && (
        <div className="flex items-center border border-slate-700/50 rounded-sm overflow-hidden h-9">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("list")}
            className={`h-9 w-9 p-0 rounded-none border-0 ${
              viewMode === "list"
                ? "bg-purple-600/20 text-purple-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
            aria-label="List view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className={`h-9 w-9 p-0 rounded-none border-0 ${
              viewMode === "grid"
                ? "bg-purple-600/20 text-purple-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Right-side extra actions */}
      {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
    </div>
  )
}
