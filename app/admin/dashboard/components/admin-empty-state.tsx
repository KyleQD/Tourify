"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AdminEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string } | { label: string; onClick: () => void }
}

export function AdminEmptyState({ icon: Icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-14 w-14 rounded-sm bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-4 shadow-lg shadow-slate-900/50 backdrop-blur-sm">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-5">{description}</p>
      {action && (
        'href' in action ? (
          <Link href={action.href}>
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/20 transition-all duration-300">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button size="sm" onClick={action.onClick} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/20 transition-all duration-300">
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
