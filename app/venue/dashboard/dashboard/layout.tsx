import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { MainNav } from "../../../app/(main)/main-nav"
import { BarChart3, Calendar, Home, ListMusic, Package, Settings, Ticket, Users, FileText, Globe } from "lucide-react"

export const metadata: Metadata = {
  title: "Venue Dashboard",
  description: "Manage venue operations, bookings, and analytics with Tourify",
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNav />
      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-gray-900 md:min-h-screen p-4">
          <nav className="space-y-1">
            <NavItem href="/venue" icon={Home} label="Overview" />
            <NavItem href="/venue/bookings" icon={Calendar} label="Bookings" />
            <NavItem href="/venue/dashboard/events" icon={ListMusic} label="Events" />
            <NavItem href="/venue/documents" icon={Package} label="Documents" />
            <NavItem href="/venue/tickets" icon={Ticket} label="Ticketing" />
            <NavItem href="/venue/analytics" icon={BarChart3} label="Venue Insights" />
            <NavItem href="/venue/finances" icon={FileText} label="Finances" />
            <NavItem href="/venue/staff" icon={Users} label="Staff Management" />
            <NavItem href="/venue/overview" icon={Globe} label="Public Profile" />
            <NavItem href="/venue/settings" icon={Settings} label="Settings" />
          </nav>
        </aside>
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

function NavItem({ href, icon: Icon, label }: NavItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:bg-gray-800"
    >
      <Icon className="mr-3 h-5 w-5" />
      {label}
    </Link>
  )
}
