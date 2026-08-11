"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Monitor, User, Maximize2, Smartphone } from "lucide-react"

type PreviewMode = "feed" | "profile" | "full" | "mobile"

interface PreviewSwitcherProps {
  children: React.ReactNode
  className?: string
}

export function PreviewSwitcher({ children, className }: PreviewSwitcherProps) {
  const [mode, setMode] = useState<PreviewMode>("feed")

  const modes: { id: PreviewMode; label: string; icon: React.ElementType; maxWidth: string }[] = [
    { id: "feed", label: "Feed", icon: Monitor, maxWidth: "max-w-xl" },
    { id: "profile", label: "Profile", icon: User, maxWidth: "max-w-lg" },
    { id: "full", label: "Full post", icon: Maximize2, maxWidth: "max-w-2xl" },
    { id: "mobile", label: "Mobile", icon: Smartphone, maxWidth: "max-w-sm" },
  ]

  const current = modes.find((m) => m.id === mode) ?? modes[0]

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode switcher tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1" role="tablist" aria-label="Preview mode">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all",
              mode === m.id
                ? "bg-purple-500/20 text-purple-300"
                : "text-gray-400 hover:text-white"
            )}
          >
            <m.icon className="h-3 w-3" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div
        role="tabpanel"
        aria-label={`${current.label} preview`}
        className={cn(
          "mx-auto transition-all duration-200",
          current.maxWidth,
          "bg-slate-900/50 rounded-lg border border-white/10 p-3"
        )}
      >
        {children}
      </div>
    </div>
  )
}
