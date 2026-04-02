"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Globe,
  Calendar,
  Music,
  Building,
  Ticket,
  Users,
  Truck,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  MessageSquare,
  Briefcase,
  ClipboardList,
  Sparkles,
  Bell,
  Layers
} from "lucide-react"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface DashboardQuickHubProps {
  stats?: Partial<DashboardStats>
}

interface DashboardStats {
  totalTours: number
  activeTours: number
  totalEvents: number
  upcomingEvents: number
  totalArtists: number
  totalVenues: number
  totalRevenue: number
  monthlyRevenue: number
  ticketsSold: number
  staffMembers: number
}

interface HubItem {
  title: string
  href: string
  description: string
  icon: any
  badge?: string
}

export function DashboardQuickHub({ stats = {} }: DashboardQuickHubProps) {
  const hubItems: HubItem[] = [
    { title: 'Tours', href: '/admin/dashboard/tours', description: 'Manage all tours', icon: Globe, badge: fmt(stats.activeTours) },
    { title: 'Events', href: '/admin/dashboard/events', description: 'Scheduling and details', icon: Calendar, badge: fmt(stats.upcomingEvents) },
    { title: 'Artists', href: '/admin/dashboard/artists', description: 'Profiles and bookings', icon: Music, badge: fmt(stats.totalArtists) },
    { title: 'Venues', href: '/admin/dashboard/venues', description: 'Partners and locations', icon: Building, badge: fmt(stats.totalVenues) },
    { title: 'Ticketing', href: '/admin/dashboard/ticketing', description: 'Sales and capacity', icon: Ticket, badge: compact(fmt(stats.ticketsSold), 'sold') },
    { title: 'Staff', href: '/admin/dashboard/staff', description: 'Teams and roles', icon: Users, badge: fmt(stats.staffMembers) },
    { title: 'Logistics', href: '/admin/dashboard/logistics', description: 'Travel and transport', icon: Truck },
    { title: 'Finances', href: '/admin/dashboard/finances', description: 'Budgets and revenue', icon: DollarSign, badge: compact(currency(stats.monthlyRevenue), 'mo') },
    { title: 'Analytics', href: '/admin/dashboard/analytics', description: 'KPIs and insights', icon: BarChart3 },
    { title: 'Messages', href: '/admin/dashboard/messages', description: 'Broadcasts and threads', icon: MessageSquare },
    { title: 'RBAC', href: '/admin/dashboard/rbac', description: 'Access and roles', icon: Shield },
    { title: 'Settings', href: '/admin/dashboard/settings', description: 'Platform config', icon: Settings },
    // Admin root features
    { title: 'Applications', href: '/admin/applications', description: 'Review candidates', icon: ClipboardList },
    { title: 'Job Postings', href: '/admin/job-postings/new', description: 'Create openings', icon: Briefcase },
    { title: 'Requests', href: '/admin/request', description: 'Manage platform requests', icon: Bell },
    { title: 'Capabilities', href: '/admin/dashboard/agencies', description: 'Agencies & partners', icon: Layers }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Quick Hub</h2>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">Overview</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hubItems.map(item => (
          <HubCard key={item.href} item={item} />
        ))}
      </div>
    </div>
  )
}

function HubCard({ item }: { item: HubItem }) {
  const Icon = item.icon
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 hover:bg-slate-900/70 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
              <Icon className="h-4 w-4 text-white" />
            </div>
            {item.title}
          </span>
          {item.badge && (
            <Badge className="bg-slate-700 text-slate-200 border-0 text-xs">{item.badge}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-slate-400 mb-3">{item.description}</p>
        <div className="flex items-center justify-between">
          <Link href={item.href}>
            <Button variant="outline" size="sm" className="border-slate-700">Open</Button>
          </Link>
          <Link href={`${item.href}${item.href.endsWith('/new') ? '' : '/new'}`}>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">Create</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function fmt(value?: number) {
  if (!value) return '0'
  return String(value)
}

function currency(value?: number) {
  if (!value) return '$0'
  return formatSafeCurrency(value)
}

function compact(value?: string, suffix?: string) {
  if (!value) return undefined
  return suffix ? `${value} ${suffix}` : value
}


