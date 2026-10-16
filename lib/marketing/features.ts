import {
  BarChart3,
  Calendar,
  Compass,
  Map,
  MessageSquare,
  Search,
  Ticket,
  Truck,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { AccentKey } from "./accent"
import type { FeatureStatus } from "./feature-status"

export interface Feature {
  slug: string
  title: string
  summary: string
  intro: string
  icon: LucideIcon
  accent: AccentKey
  status: FeatureStatus
  personas: string[]
  benefits: string[]
  steps: { title: string; body: string }[]
}

// Statuses are conservative defaults. Review before launch.
export const features: Feature[] = [
  {
    slug: "events",
    title: "Events",
    summary: "Create, publish and manage shows from one dashboard.",
    intro:
      "Set up an event once and keep its details, lineup, schedule and capacity in sync everywhere they appear.",
    icon: Calendar,
    accent: "purple",
    status: "beta",
    personas: ["venues", "event-organizers", "promoters", "fans"],
    benefits: [
      "One source of truth for date, lineup and capacity",
      "Public event pages that stay current",
      "Share a link instead of re-sending details",
      "Calendar view across every event you run",
    ],
    steps: [
      { title: "Create", body: "Add the date, venue, lineup and a description in a single guided form." },
      { title: "Publish", body: "Turn on a public event page people can find and share." },
      { title: "Manage", body: "Edit details as plans change and see them update across the platform." },
    ],
  },
  {
    slug: "ticketing",
    title: "Ticketing",
    summary: "Sell tickets and manage capacity without third-party tools.",
    intro: "Define tiers, set capacity and track sales next to the event they belong to.",
    icon: Ticket,
    accent: "amber",
    status: "beta",
    personas: ["venues", "event-organizers", "promoters", "fans"],
    benefits: [
      "Multiple ticket tiers per event",
      "Capacity limits that match the room",
      "Sales and attendance beside event details",
      "Fans buy from the same page they discover the show on",
    ],
    steps: [
      { title: "Build tiers", body: "Name each tier, set a price and a quantity." },
      { title: "Sell", body: "Fans buy from the event page. Capacity updates as tickets go." },
      { title: "Track", body: "Watch sales against capacity from the same dashboard." },
    ],
  },
  {
    slug: "tours",
    title: "Tour routing",
    summary: "Plan multi-city runs and see the whole route at a glance.",
    intro:
      "Lay out a run city by city, keep every date in one calendar and see how the legs connect.",
    icon: Map,
    accent: "blue",
    status: "beta",
    personas: ["artists", "tour-managers", "fans"],
    benefits: [
      "Multi-city routes on a single calendar",
      "See gaps and back-to-back dates early",
      "Share the route with your team",
      "Fans can follow the dates you choose to publish",
    ],
    steps: [
      { title: "Add dates", body: "Drop in cities and show dates as they firm up." },
      { title: "Review the route", body: "Spot long jumps and open days before they cost you." },
      { title: "Share", body: "Give the team the same view, and publish what fans should see." },
    ],
  },
  {
    slug: "workforce",
    title: "Workforce",
    summary: "Schedule shifts, invite staff and onboard new hires.",
    intro: "Build a roster, assign shifts and bring new team members up to speed with guided steps.",
    icon: Users,
    accent: "emerald",
    status: "beta",
    personas: ["venues", "event-organizers", "tour-managers", "crew"],
    benefits: [
      "Invite staff and crew by link",
      "Assign shifts and track availability",
      "Guided onboarding for new hires",
      "Everyone sees the same schedule",
    ],
    steps: [
      { title: "Invite", body: "Send an invite and have people set up their own profile." },
      { title: "Schedule", body: "Assign shifts against an event and see who is open." },
      { title: "Onboard", body: "Walk new hires through what they need before day one." },
    ],
  },
  {
    slug: "logistics",
    title: "Advancing and logistics",
    summary: "Keep day sheets, assets and show details in one place.",
    intro:
      "Track the details that make a show day run: schedules, equipment and the information each crew needs.",
    icon: Truck,
    accent: "rose",
    status: "in-development",
    personas: ["tour-managers", "venues", "event-organizers"],
    benefits: [
      "Show-day schedules everyone can read",
      "Equipment and asset tracking",
      "Fewer last-minute email chains",
      "A shared record of what was agreed",
    ],
    steps: [
      { title: "Advance", body: "Collect the details you need from each party before the date." },
      { title: "Share the day sheet", body: "Give the whole team one schedule for the day." },
      { title: "Track assets", body: "Know what is on site, and where it goes next." },
    ],
  },
  {
    slug: "messaging",
    title: "Messaging",
    summary: "Direct messages, groups and booking threads in one inbox.",
    intro: "Keep conversations next to the work. Bookings, shows and teams each get their own thread.",
    icon: MessageSquare,
    accent: "cyan",
    status: "available",
    personas: ["artists", "tour-managers", "venues", "event-organizers", "crew", "promoters", "fans"],
    benefits: [
      "Direct and group conversations",
      "Booking threads linked to the request",
      "One inbox instead of five apps",
      "History you can find later",
    ],
    steps: [
      { title: "Start a thread", body: "Message a person, a team or a booking request." },
      { title: "Stay in context", body: "Replies sit beside the booking or event they are about." },
      { title: "Find it later", body: "Search the history instead of scrolling a group chat." },
    ],
  },
  {
    slug: "analytics",
    title: "Analytics",
    summary: "See event performance, audience and revenue clearly.",
    intro: "Dashboards that show how shows are doing, so decisions come from the numbers.",
    icon: BarChart3,
    accent: "fuchsia",
    status: "beta",
    personas: ["artists", "tour-managers", "venues", "event-organizers", "promoters"],
    benefits: [
      "Revenue, audience and capacity in one view",
      "Compare events side by side",
      "Clear charts instead of exported spreadsheets",
      "Numbers tied to real events in your account",
    ],
    steps: [
      { title: "Connect your events", body: "Analytics read from the events and tickets you already manage." },
      { title: "Explore", body: "Switch between revenue, audience and capacity views." },
      { title: "Decide", body: "Spot what is working and where seats are sitting empty." },
    ],
  },
  {
    slug: "profiles-epk",
    title: "Profiles and EPK",
    summary: "A living profile and press kit you update once.",
    intro:
      "Present your work with a rich public profile: bio, photos, music and video, always current.",
    icon: UserCircle2,
    accent: "purple",
    status: "available",
    personas: ["artists", "venues", "crew", "promoters", "fans"],
    benefits: [
      "Bio, gallery, music and video in one place",
      "A link instead of an attachment",
      "Venue profiles with room details",
      "Update once, current everywhere",
    ],
    steps: [
      { title: "Build", body: "Add your story, media and links." },
      { title: "Publish", body: "Share one URL with bookers, press and fans." },
      { title: "Keep fresh", body: "Edit anytime. Everyone sees the latest version." },
    ],
  },
  {
    slug: "discovery",
    title: "Discovery",
    summary: "Find shows, artists, venues and opportunities.",
    intro:
      "Search and browse the Tourify community, from local shows to open roles in the industry.",
    icon: Search,
    accent: "cyan",
    status: "beta",
    personas: ["artists", "event-organizers", "crew", "promoters", "fans"],
    benefits: [
      "Find shows and artists near you",
      "Follow artists and venues",
      "Browse industry opportunities",
      "Recommendations based on what you follow",
    ],
    steps: [
      { title: "Browse", body: "Explore events, artists and venues." },
      { title: "Follow", body: "Keep up with the people and places you care about." },
      { title: "Act", body: "Get tickets, send a message or apply for a role." },
    ],
  },
  {
    slug: "bookings",
    title: "Bookings",
    summary: "Send, receive and track booking requests in one pipeline.",
    intro: "Move from first inquiry to confirmed date without losing the thread.",
    icon: Compass,
    accent: "blue",
    status: "beta",
    personas: ["artists", "tour-managers", "venues", "promoters", "crew"],
    benefits: [
      "Requests and replies in one pipeline",
      "Clear status on every inquiry",
      "Booking conversations stay attached",
      "Confirmed dates flow into the calendar",
    ],
    steps: [
      { title: "Request", body: "Send an inquiry to a venue or artist." },
      { title: "Negotiate", body: "Discuss details in a thread tied to the request." },
      { title: "Confirm", body: "Accepted bookings land on the calendar." },
    ],
  },
]

export const roadmapExtras: { title: string; body: string; status: FeatureStatus }[] = [
  { title: "AI venue matching", body: "Suggested venues and artists based on fit.", status: "in-development" },
  { title: "Contracts and riders", body: "Manage agreements next to the booking.", status: "in-development" },
  { title: "Merch and music storefront", body: "Sell directly from your profile.", status: "planned" },
  { title: "Mobile apps", body: "Day-of tools in your pocket.", status: "planned" },
]

export function getFeature(slug: string) {
  return features.find((f) => f.slug === slug)
}
