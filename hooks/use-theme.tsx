"use client"

import { useEffect, useState, createContext, useContext } from "react"

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
    // #region agent log
    fetch('http://127.0.0.1:7556/ingest/15f15573-361b-4909-ba46-1f6afc0001bf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a162f6'},body:JSON.stringify({sessionId:'a162f6',location:'use-theme.tsx:mount',message:'ThemeProvider hydrated — layout chunk loaded',data:{defaultTheme},timestamp:Date.now(),hypothesisId:'B-C'})}).catch(()=>{});
    // #endregion
    setMounted(true)
    let savedTheme: Theme | null = null
    try {
      const raw = localStorage.getItem("theme")
      if (raw === "dark" || raw === "light" || raw === "system") savedTheme = raw
    } catch {
      // storage blocked (e.g. strict privacy mode)
    }
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

    try {
      localStorage.setItem("theme", theme)
    } catch {
      // non-fatal: theme still applies via classList for this session
    }
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