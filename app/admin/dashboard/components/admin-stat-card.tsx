"use client"

import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface AdminStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  size?: 'default' | 'lg'
  isLoading?: boolean
}

const COLOR_MAP: Record<string, { bg: string; text: string; glow: string }> = {
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', glow: 'shadow-green-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', glow: 'shadow-red-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
}

function resolveColor(color?: string) {
  if (!color) return COLOR_MAP.blue
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (color.includes(key)) return val
  }
  return COLOR_MAP.blue
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  change,
  trend = 'neutral',
  size = 'default',
  isLoading = false,
}: AdminStatCardProps) {
  const resolved = resolveColor(color)
  const isLarge = size === 'lg'

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300 group">
      <CardContent className={isLarge ? 'p-6' : 'p-4'}>
        <div className="flex items-center justify-between">
          <div className={isLarge ? 'space-y-2' : 'space-y-1'}>
            <p className={`font-medium text-slate-400 ${isLarge ? 'text-sm' : 'text-xs'}`}>{title}</p>
            <div className="flex items-center gap-2">
              <p className={`font-bold text-white ${isLarge ? 'text-2xl' : 'text-xl'}`}>
                {isLoading ? '...' : value}
              </p>
              {change !== undefined && change !== 0 && (
                <div className={`flex items-center gap-0.5 text-xs ${
                  trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                  <span>{change > 0 ? '+' : ''}{change}%</span>
                </div>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className={`rounded-sm flex items-center justify-center shadow-lg ${resolved.bg} ${resolved.glow} ${isLarge ? 'h-12 w-12' : 'h-10 w-10'} group-hover:scale-105 transition-transform duration-300`}>
            <Icon className={`${resolved.text} ${isLarge ? 'h-5 w-5' : 'h-4 w-4'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
