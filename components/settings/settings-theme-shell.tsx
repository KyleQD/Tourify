'use client'

import type { CSSProperties, ReactNode } from 'react'
import {
  getDashboardTheme,
  getDashboardThemeCssVars,
  type DashboardThemeId,
} from '@/lib/dashboard/dashboard-themes'
import { cn } from '@/lib/utils'

interface SettingsThemeShellProps {
  themeId: DashboardThemeId
  children: ReactNode
  className?: string
}

export function SettingsThemeShell({
  themeId,
  children,
  className,
}: SettingsThemeShellProps) {
  const theme = getDashboardTheme(themeId)
  const style = getDashboardThemeCssVars(theme) as CSSProperties

  return (
    <div
      className={cn(
        'dashboard-theme-shell dashboard-theme-bg dashboard-theme-foreground min-h-screen transition-colors duration-300',
        className
      )}
      data-dashboard-theme={theme.id}
      data-dashboard-theme-light={theme.isLight ? 'true' : 'false'}
      style={style}
    >
      {children}
    </div>
  )
}
