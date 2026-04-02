"use client"

import type { LucideIcon } from "lucide-react"

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: LucideIcon
}

export function AdminPageHeader({ title, subtitle, actions, icon: Icon }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-10 w-10 rounded-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-purple-400" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
