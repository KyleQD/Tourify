import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Star } from "lucide-react"

export const metadata = {
  title: "Features & FAQ",
  description: "How platform features work by account type and how to access them"
}

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Features & FAQ
          </h1>
          <p className="mt-2 text-sm text-gray-300">
            Learn what you can do on Tourify, tailored for each account type, and where to access each feature.
          </p>
        </div>
        <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30 rounded-xl">Updated</Badge>
      </div>

      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-400" />
            Explore Features by Account Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {ACCOUNT_FAQ.map((section) => (
              <div key={section.id}>
                <h2 className="text-white text-lg font-semibold mb-1">{section.label}</h2>
                {section.description ? (
                  <p className="text-sm text-gray-300 mb-3 max-w-3xl">{section.description}</p>
                ) : null}
                <Card className="bg-white/5 border-white/10 rounded-xl">
                  <CardContent className="p-0">
                    <ul className="divide-y divide-white/10">
                      {section.features.map((feature) => (
                        <li key={feature.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-white text-sm font-medium leading-6">{feature.title}</h4>
                              <p className="text-sm text-gray-300 mt-1">{feature.description}</p>
                              {feature.location ? (
                                <p className="text-xs text-gray-400 mt-1">Find it: {feature.location}</p>
                              ) : null}
                            </div>
                            {feature.badge ? (
                              <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30 rounded-xl text-xs flex-shrink-0">{feature.badge}</Badge>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                {section.createCta ? (
                  <div className="mt-4">
                    <Button
                      asChild
                      className="relative overflow-hidden rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white ring-1 ring-white/20 shadow-lg hover:shadow-purple-500/30 transition-all duration-200 px-5 py-2 before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
                    >
                      <Link href={section.createCta.href}>
                        {section.createCta.label}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface FeatureItem {
  id: string
  title: string
  description: string
  href: string
  location?: string
  badge?: string
  cta?: string
}

interface AccountFAQSection {
  id: string
  label: string
  description?: string
  createCta?: { label: string, href: string }
  features: FeatureItem[]
}

const ACCOUNT_FAQ: AccountFAQSection[] = [
  {
    id: "general",
    label: "General Account",
    description: "For listeners and community members. Follow artists and venues, engage on the feed, RSVP to events, and message your network.",
    createCta: { label: "Create additional general account", href: "/create?type=general" },
    features: [
      {
        id: "feed",
        title: "Social Feed",
        description: "Share updates, photos, and releases. Engage with likes and comments. Follow accounts to tailor your feed.",
        href: "/feed",
        location: "Top navigation → News / Feed",
        badge: "Core"
      },
      {
        id: "events",
        title: "Events",
        description: "Browse upcoming shows and gatherings. RSVP to attend and get updates.",
        href: "/events",
        location: "Top navigation → Events"
      },
      {
        id: "venues",
        title: "Venues",
        description: "Find venues and explore event spaces.",
        href: "/venues",
        location: "Discover → Venues"
      },
      {
        id: "network",
        title: "Network",
        description: "Find artists, venues, and friends. Follow to see updates and message.",
        href: "/network",
        location: "Top navigation → Network"
      },
      {
        id: "messages",
        title: "Messages",
        description: "Direct messages and group chats with read receipts and attachments.",
        href: "/messages",
        location: "Top navigation → Messages"
      },
      {
        id: "music-library",
        title: "Music Library",
        description: "Explore tracks shared by artists and organize favorites.",
        href: "/artist/music/library",
        location: "Artist sidebar → Music → My Library"
      },
      {
        id: "content-upload",
        title: "Content Upload",
        description: "Upload photos, videos, and documents to enrich posts and profiles.",
        href: "/content",
        location: "Create button → Upload content"
      },
      {
        id: "profile",
        title: "Profile",
        description: "Manage your profile info, avatar, and preferences.",
        href: "/settings",
        location: "User menu → Settings → Profile",
        cta: "settings"
      }
    ]
  },
  {
    id: "artist",
    label: "Artist Account",
    description: "For musicians and performers to manage content, bookings, analytics, and EPKs. Post as your artist brand and grow your audience.",
    createCta: { label: "Create artist account", href: "/create?type=artist" },
    features: [
      {
        id: "upload",
        title: "Upload Content & Music",
        description: "Upload tracks and rich media. Organize releases and update artwork and metadata.",
        href: "/artist/content",
        location: "Artist dashboard → Content",
        badge: "Popular"
      },
      {
        id: "bookings",
        title: "Bookings",
        description: "Receive, negotiate, and confirm booking requests. See holds and status.",
        href: "/bookings",
        location: "Artist dashboard → Bookings"
      },
      {
        id: "music-library",
        title: "Music Library",
        description: "Manage your catalog, versions, and playlists for shows and promos.",
        href: "/artist/music/library",
        location: "Artist sidebar → Music → My Library"
      },
      {
        id: "music-analytics",
        title: "Music Analytics",
        description: "Performance across plays and engagement with breakdowns by time and audience.",
        href: "/artist/music/analytics",
        location: "Artist sidebar → Music → Analytics",
        badge: "Pro"
      },
      {
        id: "business",
        title: "Artist Analytics",
        description: "Business overview including audience growth, bookings, and revenue trends.",
        href: "/artist/business",
        location: "Artist top nav → Business"
      },
      {
        id: "events",
        title: "Events",
        description: "Create shows, attach lineups, and publish schedules to your audience.",
        href: "/events",
        location: "Top navigation → Events (artist view)"
      },
      {
        id: "venues",
        title: "Venues",
        description: "Search venues by location and capacity to find the right fit.",
        href: "/venues",
        location: "Discover → Venues"
      },
      {
        id: "network",
        title: "Network",
        description: "Grow relationships with venues, collaborators, and fans.",
        href: "/network",
        location: "Top navigation → Network"
      },
      {
        id: "messaging",
        title: "Messaging",
        description: "Coordinate details with collaborators in real time.",
        href: "/messages",
        location: "Top navigation → Messages"
      },
      {
        id: "social-feed",
        title: "Social Feed",
        description: "Announce releases, tours, and behind‑the‑scenes content.",
        href: "/feed",
        location: "Top navigation → News / Feed"
      },
      {
        id: "content-upload",
        title: "Content Upload",
        description: "Store press photos, riders, and video snippets for reuse.",
        href: "/content",
        location: "Create button → Upload content"
      },
      {
        id: "analytics-dashboard",
        title: "Analytics Dashboard",
        description: "Cross-feature metrics with quick filters and export.",
        href: "/analytics",
        location: "Artist dashboard → Analytics"
      },
      {
        id: "team-management",
        title: "Team Management",
        description: "Invite managers and collaborators with role-based permissions.",
        href: "/team",
        location: "Admin dashboard → Teams & Crew",
        badge: "Pro"
      },
      {
        id: "epk",
        title: "EPK Builder",
        description: "Generate a professional press kit with bios, media, and tech riders.",
        href: "/artist/epk",
        location: "Artist content → EPK",
        badge: "Pro"
      }
    ]
  },
  {
    id: "venue",
    label: "Venue Account",
    description: "For venues and event spaces to publish events, manage bookings, and analyze performance.",
    createCta: { label: "Create venue account", href: "/create?type=venue" },
    features: [
      {
        id: "create-event",
        title: "Create Event",
        description: "Create events, manage lineups, ticketing details, and schedules.",
        href: "/events/create",
        location: "Venue dashboard → Create Event",
        badge: "Core"
      },
      {
        id: "venue-bookings",
        title: "Manage Bookings",
        description: "Receive, negotiate, and confirm artist booking requests.",
        href: "/venue/bookings",
        location: "Venue dashboard → Bookings"
      },
      {
        id: "events",
        title: "Events",
        description: "Publish event pages and keep attendees updated.",
        href: "/events",
        location: "Venue top nav → Events"
      },
      {
        id: "venues",
        title: "Venues",
        description: "Explore peer venues for collaboration and benchmarking.",
        href: "/venues",
        location: "Discover → Venues"
      },
      {
        id: "network",
        title: "Network",
        description: "Build relationships with artists and organizers.",
        href: "/network",
        location: "Top navigation → Network"
      },
      {
        id: "messaging",
        title: "Messaging",
        description: "Coordinate logistics with artists and staff.",
        href: "/messages",
        location: "Top navigation → Messages"
      },
      {
        id: "social-feed",
        title: "Social Feed",
        description: "Promote shows and venue highlights to your followers.",
        href: "/feed",
        location: "Top navigation → News / Feed"
      },
      {
        id: "content-upload",
        title: "Content Upload",
        description: "Upload flyers, videos, menus, and other media.",
        href: "/content",
        location: "Create button → Upload content"
      },
      {
        id: "venue-analytics",
        title: "Venue Analytics",
        description: "Track revenue, attendance, and booking conversion rates.",
        href: "/venue/analytics",
        location: "Venue dashboard → Analytics"
      },
      {
        id: "analytics-dashboard",
        title: "Analytics Dashboard",
        description: "Cross-feature metrics with filters and CSV export.",
        href: "/analytics",
        location: "Venue dashboard → Analytics"
      },
      {
        id: "team-management",
        title: "Team Management",
        description: "Invite staff and manage permissions for booking and publishing.",
        href: "/team",
        location: "Admin dashboard → Teams & Crew",
        badge: "Pro"
      },
      {
        id: "equipment",
        title: "Equipment",
        description: "Catalog PA, backline, and stage plots for artists.",
        href: "/venue/equipment",
        location: "Venue dashboard → Equipment"
      }
    ]
  },
  {
    id: "admin",
    label: "Admin Account",
    description: "Organizer accounts for agencies, promoters, and teams coordinating artists and venues across events and tours.",
    createCta: { label: "Create organization account", href: "/create?type=admin" },
    features: [
      {
        id: "admin-dashboard",
        title: "Admin Dashboard",
        description: "Organization-wide view of accounts, events, and performance.",
        href: "/admin/dashboard",
        location: "Organization top nav → Dashboard"
      },
      {
        id: "user-management",
        title: "User Management",
        description: "Invite members, assign roles, and manage access.",
        href: "/admin/dashboard/users",
        location: "Organization dashboard → Users"
      },
      {
        id: "platform-analytics",
        title: "Platform Analytics",
        description: "High-level KPIs across events, accounts, and engagement.",
        href: "/admin/dashboard/analytics",
        location: "Organization dashboard → Analytics"
      },
      {
        id: "events",
        title: "Events",
        description: "Coordinate multi-venue or multi-artist events.",
        href: "/events",
        location: "Organization dashboard → Events"
      },
      {
        id: "venues",
        title: "Venues",
        description: "Discover venues and manage relationships.",
        href: "/venues",
        location: "Discover → Venues"
      },
      {
        id: "network",
        title: "Network",
        description: "Build partnerships across artists and venues.",
        href: "/network",
        location: "Top navigation → Network"
      },
      {
        id: "messaging",
        title: "Messaging",
        description: "Coordinate with teams and partners.",
        href: "/messages",
        location: "Top navigation → Messages"
      },
      {
        id: "social-feed",
        title: "Social Feed",
        description: "Promote tours and announcements.",
        href: "/feed",
        location: "Top navigation → News / Feed"
      },
      {
        id: "content-upload",
        title: "Content Upload",
        description: "Share media and documents with collaborators.",
        href: "/content",
        location: "Create button → Upload content"
      },
      {
        id: "team-management",
        title: "Team Management",
        description: "Manage organization members and roles.",
        href: "/team",
        location: "Organization dashboard → Teams & Crew",
        badge: "Pro"
      }
    ]
  }
]


