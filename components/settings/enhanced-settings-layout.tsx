"use client"

import type React from "react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Settings } from "lucide-react"

interface EnhancedSettingsLayoutProps {
  children: React.ReactNode
  compact?: boolean
}

export function EnhancedSettingsLayout({ children, compact = false }: EnhancedSettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/10 to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/10 to-transparent pointer-events-none" />
      
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-8">
            {!compact && (
              <>
                {/* Header Section */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                      <Settings className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Settings
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                      Customize your experience and manage your account preferences with our next-generation settings interface
                    </p>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-4 py-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                      Account Active
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-2">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Pro Features
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-4 py-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                      Synced
                    </Badge>
                  </div>
                </div>
                
                <Separator className="bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </>
            )}
            
            {/* Content */}
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 