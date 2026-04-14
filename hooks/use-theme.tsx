"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { sendAgentLog } from "@/lib/debug/agent-log-client"

type Theme = "dark" | "light" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ 
  children,
  defaultTheme = "system"
}: { 
  children: React.ReactNode
  defaultTheme?: Theme 
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // #region agent log
    let savedTheme: Theme | null = null
    try {
      savedTheme = localStorage.getItem("theme") as Theme | null
    } catch (e) {
      const err = e as { name?: string; message?: string }
      sendAgentLog({
        runId: 'verify',
        hypothesisId: 'B',
        location: 'hooks/use-theme.tsx:theme-read',
        message: 'localStorage.getItem(theme) threw',
        data: { errName: err?.name, errMsgLen: err?.message?.length },
      })
    }
    // #endregion
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      setTheme(systemTheme)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // #region agent log
    try {
      localStorage.setItem("theme", theme)
    } catch (e) {
      const err = e as { name?: string; message?: string }
      sendAgentLog({
        runId: 'verify',
        hypothesisId: 'B',
        location: 'hooks/use-theme.tsx:theme-write',
        message: 'localStorage.setItem(theme) threw (non-fatal)',
        data: { errName: err?.name, errMsgLen: err?.message?.length },
      })
    }
    // #endregion
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "system") return "light"
      if (prev === "light") return "dark"
      return "system"
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
} 