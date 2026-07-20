'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DASHBOARD_THEME_LIST,
  type DashboardThemeId,
} from '@/lib/dashboard/dashboard-themes'

interface DashboardThemePickerProps {
  value: DashboardThemeId
  onChange: (themeId: DashboardThemeId) => void
  className?: string
}

export function DashboardThemePicker({
  value,
  onChange,
  className,
}: DashboardThemePickerProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-white">Dashboard Color Theme</h3>
        <p className="text-sm text-white/60 mt-1">
          Choose a coordinated palette for your personal dashboard.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {DASHBOARD_THEME_LIST.map((theme) => {
          const isSelected = value === theme.id

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={cn(
                'relative rounded-2xl border p-3 text-left transition-all duration-200',
                'hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                isSelected
                  ? 'border-white/50 bg-white/15 shadow-lg shadow-black/20'
                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
              )}
              aria-pressed={isSelected}
              aria-label={`${theme.name} dashboard theme`}
            >
              <div
                className="h-14 w-full rounded-xl mb-3 border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${theme.bgFrom}, ${theme.bgVia}, ${theme.bgTo})`,
                }}
              />

              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: theme.primary }}
                />
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: theme.secondary }}
                />
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{theme.name}</div>
                  <div className="text-[11px] text-white/50 leading-snug mt-0.5">
                    {theme.description}
                  </div>
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-black">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
