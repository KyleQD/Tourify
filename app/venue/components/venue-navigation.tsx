"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Settings,
  Ticket,
  Users,
  Wrench,
  Upload,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  submenu?: NavItem[]
}

export default function VenueNavigation() {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Events",
      href: "/venue/dashboard/events",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Equipment",
      href: "/equipment",
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      title: "Finances",
      href: "/venue/finances",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Team",
      href: "/venue/staff",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Documents",
      href: "/documents",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Analytics",
      href: "/venue/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      submenu: [
        {
          title: "Overview",
          href: "/venue/analytics",
          icon: <Home className="h-4 w-4" />,
        },
        {
          title: "Attendance",
          href: "/venue/analytics",
          icon: <Users className="h-4 w-4" />,
        },
        {
          title: "Financial",
          href: "/venue/finances",
          icon: <CreditCard className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Integrations",
      href: "/integrations",
      icon: <Link2 className="h-5 w-5" />,
      submenu: [
        {
          title: "Overview",
          href: "/integrations",
          icon: <Home className="h-4 w-4" />,
        },
        {
          title: "Ticketing",
          href: "/integrations/ticketing",
          icon: <Ticket className="h-4 w-4" />,
        },
        {
          title: "Export Data",
          href: "/integrations/export",
          icon: <Upload className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Messages",
      href: "/messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const hasSubmenu = item.submenu && item.submenu.length > 0

        return (
          <div key={item.href} className="space-y-1">
            <Link
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
                isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white",
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.title}
            </Link>

            {hasSubmenu && (
              <div className="ml-8 space-y-1">
                {item.submenu?.map((subitem) => {
                  const isSubActive = pathname === subitem.href

                  return (
                    <Link
                      key={subitem.href}
                      href={subitem.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
                        isSubActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white",
                      )}
                    >
                      <span className="mr-3">{subitem.icon}</span>
                      {subitem.title}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
