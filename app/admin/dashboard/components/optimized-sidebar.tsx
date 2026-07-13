"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useAdminStats } from "../hooks/use-admin-stats"
import { isOrganizationType, normalizeAccountType } from "@/lib/accounts/account-types"
import {
  Home,
  Globe,
  Calendar,
  Ticket,
  Truck,
  Users,
  DollarSign,
  Package,
  Settings,
  Music,
  Building,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Award,
  Clock,
  Radio,
  RadioTower,
  Plus,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  Boxes,
  Store,
  Link2,
  BookOpen,
  Globe2,
  FileText,
  Rss,
  Shield,
  UserCheck,
  Briefcase,
  ClipboardList,
  Cpu,
  Flag,
  Crown,
  Target,
  MessageSquare,
} from "lucide-react"

const STORAGE_KEY = "admin_sidebar_expanded"

function getHiringEntityType(accountType: string | undefined) {
  const normalized = normalizeAccountType(accountType)
  if (normalized === "venue") return "venue"
  if (normalized === "artist" || normalized === "service") return "artist"
  if (isOrganizationType(normalized)) return "organization"
  return null
}

function getHiringDisplayName(currentAccount: ReturnType<typeof useMultiAccount>["currentAccount"]) {
  const profile = currentAccount?.profile_data as Record<string, unknown> | undefined
  const candidates = [
    (currentAccount as { display_name?: string } | null)?.display_name,
    profile?.display_name,
    profile?.organization_name,
    profile?.venue_name,
    profile?.artist_name,
    profile?.stage_name,
    profile?.name,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate
  }

  return undefined
}

function getHiringHref(path: string, currentAccount: ReturnType<typeof useMultiAccount>["currentAccount"]) {
  const entityType = getHiringEntityType(currentAccount?.account_type)
  if (!entityType || !currentAccount?.profile_id) return path

  const params = new URLSearchParams()
  params.set("entity_type", entityType)
  params.set("entity_id", currentAccount.profile_id)
  if (entityType === "venue") params.set("venue_id", currentAccount.profile_id)

  const displayName = getHiringDisplayName(currentAccount)
  if (displayName) params.set("display_name", displayName)

  return `${path}?${params.toString()}`
}

function getStaffTabHref(tab: string, currentAccount?: ReturnType<typeof useMultiAccount>["currentAccount"]) {
  const base = getHiringHref("/admin/dashboard/staff", currentAccount ?? null)
  const joiner = base.includes("?") ? "&" : "?"
  return `${base}${joiner}tab=${encodeURIComponent(tab)}`
}

function doesNavHrefMatchLocation(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
) {
  const q = href.indexOf("?")
  const path = q === -1 ? href : href.slice(0, q)
  const query = q === -1 ? "" : href.slice(q + 1)
  if (pathname !== path) return false
  if (!query) return true
  const expected = new URLSearchParams(query)
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) return false
  }
  return true
}

interface NavItem {
  label: string
  href: string
  icon: any
  badge?: string
  badgeColor?: string
  children?: NavItem[]
  isNew?: boolean
  description?: string
  shortcut?: string
  metaShortcutKey?: string
  /** accent color class applied to the left border when category is expanded */
  accentColor?: string
}

export function OptimizedSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { currentAccount } = useMultiAccount()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const { stats } = useAdminStats()

  const profile = currentAccount?.profile_data as
    | { display_name?: string; username?: string; organization_name?: string }
    | undefined
  const sidebarHeaderTitle =
    (currentAccount as { display_name?: string } | null)?.display_name ||
    (currentAccount as { username?: string } | null)?.username ||
    profile?.display_name ||
    profile?.username ||
    profile?.organization_name ||
    "Organizer"

  // ─── Navigation structure: Dashboard + 6 collapsible categories ───────────
  const navItems: NavItem[] = useMemo(
    () => [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: Home,
        description: "Main dashboard overview",
        shortcut: "⌘1",
        metaShortcutKey: "1",
      },
      {
        label: "Operations",
        href: "__operations__",
        icon: Activity,
        accentColor: "border-l-purple-500",
        description: "Tours, events, logistics & calendar",
        children: [
          {
            label: "Tours",
            href: "/admin/dashboard/tours",
            icon: Globe,
            badge: stats?.totalTours?.toString() || undefined,
            badgeColor: "bg-purple-500/20 text-purple-400",
            description: "Manage tours and itineraries",
            shortcut: "⌘2",
            metaShortcutKey: "2",
          },
          {
            label: "Events",
            href: "/admin/dashboard/events",
            icon: Calendar,
            badge: stats?.totalEvents?.toString() || undefined,
            badgeColor: "bg-green-500/20 text-green-400",
            description: "Event management and scheduling",
            shortcut: "⌘3",
            metaShortcutKey: "3",
          },
          {
            label: "Calendar",
            href: "/admin/dashboard/calendar",
            icon: Clock,
            description: "Calendar view of all events & tours",
            isNew: true,
          },
          {
            label: "Logistics",
            href: "/admin/dashboard/logistics",
            icon: Truck,
            description: "Transportation, site maps & equipment",
            shortcut: "⌘8",
            metaShortcutKey: "8",
          },
        ],
      },
      {
        label: "Workforce",
        href: "__workforce__",
        icon: Users,
        accentColor: "border-l-cyan-500",
        description: "Staff, scheduling, hiring & permissions",
        children: [
          {
            label: "Hiring Hub",
            href: getHiringHref("/admin/dashboard/hiring", currentAccount),
            icon: UserCheck,
            badge: stats?.staffMembers?.toString() || undefined,
            badgeColor: "bg-cyan-500/20 text-cyan-400",
            description: "Jobs, applications, onboarding and roster",
            shortcut: "⌘7",
            metaShortcutKey: "7",
          },
          {
            label: "Scheduling & Shifts",
            href: getStaffTabHref("scheduling", currentAccount),
            icon: Clock,
            description: "Shift calendar and zone assignments",
          },
          {
            label: "Applications",
            href: getHiringHref("/admin/dashboard/applications", currentAccount),
            icon: ClipboardList,
            description: "Review and manage applicants",
          },
          {
            label: "Candidates",
            href: getHiringHref("/admin/dashboard/candidates", currentAccount),
            icon: Award,
            description: "Onboarding candidates and compliance",
          },
          {
            label: "Roster",
            href: getHiringHref("/admin/dashboard/roster", currentAccount),
            icon: Users,
            description: "Team roster and Work Mode assignments",
          },
          {
            label: "Organization team",
            href: "/admin/dashboard/organization",
            icon: Building,
            description: "Tour manager grants and artist roster",
          },
          {
            label: "Roles & Permissions",
            href: "/admin/dashboard/rbac",
            icon: Shield,
            description: "Entity RBAC and access control",
          },
          {
            label: "Staff Operations",
            href: getHiringHref("/admin/dashboard/staff", currentAccount),
            icon: Award,
            description: "Scheduling, communications and analytics",
          },
        ],
      },
      {
        label: "Commerce",
        href: "__commerce__",
        icon: DollarSign,
        accentColor: "border-l-green-500",
        description: "Ticketing, finances, marketplace & store",
        children: [
          {
            label: "Ticketing",
            href: "/admin/dashboard/ticketing",
            icon: Ticket,
            badge: stats?.ticketsSold
              ? `${(stats.ticketsSold / 1000).toFixed(1)}K`
              : undefined,
            badgeColor: "bg-blue-500/20 text-blue-400",
            description: "Ticket sales and management",
            shortcut: "⌘6",
            metaShortcutKey: "6",
          },
          {
            label: "Finances",
            href: "/admin/dashboard/finances",
            icon: DollarSign,
            badge: stats?.monthlyRevenue
              ? `$${(stats.monthlyRevenue / 1000).toFixed(0)}K`
              : undefined,
            badgeColor: "bg-green-500/20 text-green-400",
            description: "Financial tracking and reporting",
            shortcut: "⌘9",
            metaShortcutKey: "9",
          },
          {
            label: "Marketplace",
            href: "/admin/dashboard/marketplace",
            icon: ShoppingBag,
            description: "Listings, orders and payouts",
          },
          {
            label: "Store",
            href: "/admin/dashboard/store",
            icon: Store,
            description: "Merch store management",
          },
          {
            label: "Inventory",
            href: "/admin/dashboard/inventory",
            icon: Boxes,
            description: "Equipment and merch inventory",
          },
        ],
      },
      {
        label: "Network",
        href: "__network__",
        icon: Link2,
        accentColor: "border-l-pink-500",
        description: "Artists, venues, agencies & connections",
        children: [
          {
            label: "Artists",
            href: "/admin/dashboard/artists",
            icon: Music,
            badge: stats?.totalArtists?.toString() || undefined,
            badgeColor: "bg-pink-500/20 text-pink-400",
            description: "Artist profiles and bookings",
            shortcut: "⌘4",
            metaShortcutKey: "4",
          },
          {
            label: "Venues",
            href: "/admin/dashboard/venues",
            icon: Building,
            badge: stats?.totalVenues?.toString() || undefined,
            badgeColor: "bg-orange-500/20 text-orange-400",
            description: "Venue partnerships and management",
            shortcut: "⌘5",
            metaShortcutKey: "5",
          },
          {
            label: "Agencies",
            href: "/admin/dashboard/agencies",
            icon: Briefcase,
            description: "Performance and staffing agencies",
          },
          {
            label: "Connections",
            href: "/admin/dashboard/network",
            icon: Link2,
            description: "Network connections and requests",
          },
          {
            label: "Communications",
            href: "/admin/dashboard/communications",
            icon: MessageSquare,
            description: "Direct messages and group threads",
          },
        ],
      },
      {
        label: "Content",
        href: "__content__",
        icon: BookOpen,
        accentColor: "border-l-orange-500",
        description: "Library, music, EPK, website & feed",
        children: [
          {
            label: "Content Library",
            href: "/admin/dashboard/content",
            icon: FileText,
            description: "Content moderation and management",
          },
          {
            label: "Music",
            href: "/admin/dashboard/music",
            icon: Music,
            description: "Music catalog and releases",
          },
          {
            label: "EPK",
            href: "/admin/dashboard/epk",
            icon: Package,
            description: "Electronic press kits",
          },
          {
            label: "Website",
            href: "/admin/dashboard/website",
            icon: Globe2,
            description: "Website pages and settings",
          },
          {
            label: "Feed",
            href: "/admin/dashboard/feed",
            icon: Rss,
            description: "Organizer network activity feed",
          },
        ],
      },
      {
        label: "Insights & System",
        href: "__insights__",
        icon: BarChart3,
        accentColor: "border-l-blue-500",
        description: "Analytics, telemetry, features & settings",
        children: [
          {
            label: "Analytics",
            href: "/admin/dashboard/analytics",
            icon: BarChart3,
            description: "Data insights and reports",
            shortcut: "⌘0",
            metaShortcutKey: "0",
          },
          {
            label: "Connect Telemetry",
            href: "/admin/dashboard/connect",
            icon: RadioTower,
            badge: "New",
            badgeColor: "bg-emerald-500/20 text-emerald-300",
            description: "In-person connect funnel monitoring",
          },
          {
            label: "Feature Flags",
            href: "/admin/dashboard/features",
            icon: Flag,
            description: "Feature flags and rollout controls",
          },
          {
            label: "Audit Log",
            href: "/admin/dashboard/settings/audit",
            icon: Shield,
            description: "Admin action history and compliance log",
          },
          {
            label: "Settings",
            href: "/admin/dashboard/settings",
            icon: Settings,
            description: "System configuration",
            shortcut: "⌘,",
            metaShortcutKey: ",",
          },
        ],
      },
    ],
    [currentAccount, stats],
  )

  // ─── Collect all shortcut-bearing leaf items for keyboard handler ──────────
  const allLeafItems = useMemo(() => {
    const leaves: NavItem[] = []
    for (const item of navItems) {
      if (item.metaShortcutKey) leaves.push(item)
      if (item.children) {
        for (const child of item.children) {
          if (child.metaShortcutKey) leaves.push(child)
        }
      }
    }
    return leaves
  }, [navItems])

  // ─── Restore expanded state from localStorage ─────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        setExpandedItems(parsed)
        return
      }
    } catch {}
    // Default: auto-expand the category that contains the current path
    const active = navItems.find(
      (item) =>
        item.children?.some(
          (child) =>
            pathname.startsWith(child.href.split("?")[0]) ||
            doesNavHrefMatchLocation(pathname, searchParams, child.href),
        ),
    )
    if (active) setExpandedItems([active.href])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist expanded state ───────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedItems))
    } catch {}
  }, [expandedItems])

  // ─── Auto-expand category when navigating to a child page ────────────────
  useEffect(() => {
    for (const item of navItems) {
      if (!item.children) continue
      const childActive = item.children.some(
        (child) =>
          pathname.startsWith(child.href.split("?")[0]) ||
          doesNavHrefMatchLocation(pathname, searchParams, child.href),
      )
      if (childActive && !expandedItems.includes(item.href)) {
        setExpandedItems((prev) => [...prev, item.href])
        break
      }
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mobile detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) setShowMobileMenu(false)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return
      const item = allLeafItems.find((i) => i.metaShortcutKey === e.key)
      if (!item) return
      e.preventDefault()
      window.location.href = item.href
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [allLeafItems])

  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    )
  }, [])

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems
    const q = searchQuery.toLowerCase()
    return navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.children?.some((child) => child.label.toLowerCase().includes(q)),
    )
  }, [navItems, searchQuery])

  // ─── Render ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div
      data-education-anchor="admin-sidebar"
      className={`flex flex-col h-[calc(100vh-4rem)] bg-slate-950/95 backdrop-blur-sm border-r border-slate-800/50 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{sidebarHeaderTitle}</h2>
                <p className="text-xs text-slate-400">Event & Tour Management</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white h-8 w-8 p-0 shrink-0"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="pl-10 h-9 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5 mt-1">
        {filteredNavItems.map((item) => {
          const isCategory = item.href.startsWith("__")
          const isExpanded = expandedItems.includes(item.href)
          const hasChildren = !!item.children?.length

          // Dashboard: direct active check
          if (!isCategory) {
            const isActive =
              doesNavHrefMatchLocation(pathname, searchParams, item.href) ||
              (item.href !== "/admin/dashboard" &&
                pathname.startsWith(item.href.split("?")[0] + "/"))
            return (
              <TooltipProvider key={item.href}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 group text-sm ${
                        isActive
                          ? "bg-purple-600/10 text-white border-l-2 border-l-purple-500"
                          : "hover:bg-slate-800/50 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${
                            isActive
                              ? "text-purple-400"
                              : "text-slate-400 group-hover:text-white"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="font-medium truncate">{item.label}</span>
                        )}
                      </div>
                      {!isCollapsed && item.badge && (
                        <Badge
                          className={`text-xs px-1.5 py-0.5 ${item.badgeColor || "bg-slate-700 text-slate-300"}`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                      <p className="font-medium text-white">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-slate-400">{item.description}</p>
                      )}
                      {item.shortcut && (
                        <p className="text-xs text-purple-400">{item.shortcut}</p>
                      )}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          }

          // Category item — no href navigation, just toggle
          const anyChildActive = item.children?.some(
            (child) =>
              doesNavHrefMatchLocation(pathname, searchParams, child.href) ||
              pathname.startsWith(child.href.split("?")[0] + "/"),
          )

          return (
            <div key={item.href}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => !isCollapsed && toggleExpanded(item.href)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 group text-sm ${
                        isExpanded
                          ? `bg-slate-800/40 text-white border-l-2 ${item.accentColor || "border-l-slate-500"}`
                          : anyChildActive
                            ? "bg-slate-800/20 text-slate-200 hover:bg-slate-800/40 hover:text-white"
                            : "hover:bg-slate-800/50 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${
                            isExpanded || anyChildActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-white"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="font-semibold truncate text-xs uppercase tracking-wider">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && hasChildren && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {anyChildActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                      <p className="font-medium text-white">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-slate-400">{item.description}</p>
                      )}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              {/* Category children */}
              {hasChildren && isExpanded && !isCollapsed && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="ml-3 mt-0.5 space-y-0.5"
                  >
                    {item.children?.map((child) => {
                      const isChildActive =
                        doesNavHrefMatchLocation(pathname, searchParams, child.href) ||
                        pathname.startsWith(child.href.split("?")[0] + "/")
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          prefetch={false}
                          className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 text-sm group ${
                            isChildActive
                              ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                              : "hover:bg-slate-800/30 text-slate-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </div>
                          {child.badge && (
                            <Badge
                              className={`text-xs px-1.5 py-0 ml-1 shrink-0 ${child.badgeColor || "bg-slate-700 text-slate-300"}`}
                            >
                              {child.badge}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Collapsed: show children as tooltips */}
              {isCollapsed && hasChildren && (
                <div className="mt-0.5 space-y-0.5">
                  {item.children?.map((child) => {
                    const isChildActive =
                      doesNavHrefMatchLocation(pathname, searchParams, child.href) ||
                      pathname.startsWith(child.href.split("?")[0] + "/")
                    return (
                      <TooltipProvider key={child.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={child.href}
                              prefetch={false}
                              className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                                isChildActive
                                  ? "bg-purple-600/20 text-purple-400"
                                  : "hover:bg-slate-800/30 text-slate-500 hover:text-white"
                              }`}
                            >
                              <child.icon className="h-3.5 w-3.5" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-slate-800 border-slate-700">
                            <p className="font-medium text-white">{child.label}</p>
                            {child.shortcut && (
                              <p className="text-xs text-purple-400">{child.shortcut}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: Create + Settings */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800/50">
          <div className="flex space-x-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-48 bg-slate-900 border-slate-700 text-slate-100"
              >
                <DropdownMenuItem asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Link href="/admin/dashboard/tours/builder" prefetch={false}>New Tour</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Link href="/admin/dashboard/events/create" prefetch={false}>New Event</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                  <Link href={getHiringHref("/admin/dashboard/hiring", currentAccount)} prefetch={false}>New Job Posting</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/admin/dashboard/settings" prefetch={false}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs px-2"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="fixed top-20 left-4 z-[100] ml-2 mt-2 md:hidden bg-slate-800/80 backdrop-blur-sm border border-slate-700"
        >
          <Menu className="h-5 w-5 text-white" />
        </Button>

        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowMobileMenu(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="absolute left-0 top-0 h-full w-80 max-w-[80vw]"
              >
                <SidebarContent />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  return <SidebarContent />
}
