"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Home,
  Calendar,
  Users,
  Settings,
  LogOut,
  Music2,
  MapPin,
  Ticket,
  CalendarCheck,
  BarChart,
  Grid,
  FileText,
  MessageSquare,
  Video,
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import React from 'react'
import { motion } from 'framer-motion'

const routes = [
  { label: "Home", icon: Home, href: "/artist" },
  { label: "Overview", icon: BarChart, href: "/artist/overview" },
  { label: "Content", icon: Video, href: "/artist/content" },
  { label: "Community", icon: Users, href: "/artist/community" },
  { label: "Business", icon: ShoppingBag, href: "/artist/business" },
  { label: "Events", icon: Calendar, href: "/artist/events" },
  { label: "Analytics", icon: TrendingUp, href: "/artist/dashboard/analytics" },
  { label: "EPK", icon: Tag, href: "/artist/epk" },
  { label: "Music", icon: Music2, href: "/artist/music" },
  { label: "Profile", icon: Settings, href: "/artist/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <motion.aside
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      className="space-y-4 py-4 flex flex-col h-full bg-gradient-to-br from-[#191c24] to-[#23263a] border-r border-gray-800 w-[220px] rounded-xl shadow-2xl m-3"
      aria-label="Sidebar navigation"
    >
      <div className="px-3 py-2 flex-1">
        <nav className="space-y-1" aria-label="Main">
          {routes.map((route) => (
            <motion.div
              key={route.label}
              whileHover={{ scale: 1.04, backgroundColor: '#23263a' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Link
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500",
                  isActive(route.href)
                    ? "text-white bg-gray-800 shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                )}
                aria-current={isActive(route.href) ? "page" : undefined}
                tabIndex={0}
              >
                <route.icon className="h-5 w-5 mr-3 transition-transform group-hover:scale-110" />
                {route.label}
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>
    </motion.aside>
  )
}

