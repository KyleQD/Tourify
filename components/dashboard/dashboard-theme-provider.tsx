'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import {
  DEFAULT_DASHBOARD_THEME_ID,
  getDashboardTheme,
  getDashboardThemeCssVars,
  isDashboardThemeId,
  readCachedDashboardThemeId,
  writeCachedDashboardThemeId,
  type DashboardThemeId,
  type DashboardThemePalette,
} from '@/lib/dashboard/dashboard-themes'

interface DashboardThemeContextValue {
  themeId: DashboardThemeId
  theme: DashboardThemePalette
  setThemeId: (themeId: DashboardThemeId) => void
}

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null)

interface DashboardThemeProviderProps {
  children: ReactNode
}

export function DashboardThemeProvider({ children }: DashboardThemeProviderProps) {
  const { user } = useAuth()
  const [themeId, setThemeIdState] = useState<DashboardThemeId>(DEFAULT_DASHBOARD_THEME_ID)
  const [hasHydratedCache, setHasHydratedCache] = useState(false)

  useEffect(() => {
    setThemeIdState(readCachedDashboardThemeId())
    setHasHydratedCache(true)
  }, [])

  useEffect(() => {
    const userId = user?.id
    if (!userId || !hasHydratedCache) return

    let isCancelled = false

    async function loadTheme() {
      const { data } = await supabase
        .from('profiles')
        .select('account_settings')
        .eq('id', userId)
        .single()

      if (isCancelled) return

      const stored = data?.account_settings?.appearance?.dashboard_theme
      if (!isDashboardThemeId(stored)) return

      setThemeIdState(stored)
      writeCachedDashboardThemeId(stored)
    }

    loadTheme().catch((error) => {
      console.error('Failed to load dashboard theme:', error)
    })

    return () => {
      isCancelled = true
    }
  }, [user?.id, hasHydratedCache])

  const theme = useMemo(() => getDashboardTheme(themeId), [themeId])

  const setThemeId = (nextId: DashboardThemeId) => {
    const resolved = getDashboardTheme(nextId).id
    setThemeIdState(resolved)
    writeCachedDashboardThemeId(resolved)
  }

  const style = useMemo(
    () => getDashboardThemeCssVars(theme) as CSSProperties,
    [theme]
  )

  const value = useMemo(
    () => ({ themeId, theme, setThemeId }),
    [themeId, theme]
  )

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        className="dashboard-theme-shell min-h-screen"
        data-dashboard-theme={theme.id}
        data-dashboard-theme-light={theme.isLight ? 'true' : 'false'}
        style={style}
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  )
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext)
  if (!context) {
    return {
      themeId: DEFAULT_DASHBOARD_THEME_ID,
      theme: getDashboardTheme(DEFAULT_DASHBOARD_THEME_ID),
      setThemeId: () => undefined,
    }
  }
  return context
}
