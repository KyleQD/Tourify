"use client"

import { ReactNode, type CSSProperties } from 'react'
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PublicProfileLayoutProps {
  children: ReactNode
  profileName?: string
  profileType?: 'artist' | 'venue' | 'general'
  className?: string
  style?: CSSProperties
}

export function PublicProfileLayout({ 
  children, 
  className,
  style,
}: PublicProfileLayoutProps) {
  const { isAuthenticated } = useAuth()

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-black via-slate-950 to-black",
        className
      )}
      style={style}
    >
      {/* Profile Content - Main nav is handled by root layout */}
      <div className="relative">
        {children}
      </div>

      {/* Minimal Footer - Only for non-authenticated users */}
      {!isAuthenticated && (
        <footer className="bg-black/50 border-t border-white/10 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-sm text-white/60">
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
                <Link href="/help" className="hover:text-white transition-colors">
                  Help
                </Link>
              </div>
              <div className="text-sm text-white/40">
                © 2024 Tourify. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
