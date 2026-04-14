"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Palette, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { JUKEBOX_THEMES, type JukeboxVisualTheme } from "@/lib/jukebox/visual-themes"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { motion, AnimatePresence } from "framer-motion"

export function ThemeSelector() {
  const ctx = useJukeboxOptional()
  const [isOpen, setIsOpen] = useState(false)

  if (!ctx) return null
  const { state, setVisualTheme } = ctx
  const currentThemeId = state.visualTheme

  return (
    <div className="w-full max-w-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-xs text-slate-400 hover:text-white h-8"
      >
        <span className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" />
          Customize
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 pt-3">
              {JUKEBOX_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={currentThemeId === theme.id}
                  onSelect={() => setVisualTheme(theme.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThemeCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: JukeboxVisualTheme
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all",
        "hover:bg-white/5",
        isActive
          ? "bg-white/10 ring-2 ring-purple-500/50"
          : "bg-white/[0.02]"
      )}
    >
      <div
        className={cn(
          "h-10 w-full rounded-lg bg-gradient-to-br",
          theme.previewGradient
        )}
      />
      <span className={cn(
        "text-[10px] font-medium",
        isActive ? "text-purple-300" : "text-slate-400 group-hover:text-white"
      )}>
        {theme.name}
      </span>
      {isActive && (
        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-400" />
      )}
    </button>
  )
}
