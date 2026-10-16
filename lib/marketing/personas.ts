import {
  Building2,
  CalendarDays,
  Headphones,
  Megaphone,
  Mic2,
  Route,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { AccentKey } from "./accent"

export interface Persona {
  slug: string
  name: string
  short: string
  icon: LucideIcon
  accent: AccentKey
  tagline: string
  headline: [string, string]
  sub: string
  metaDescription: string
  pains: { before: string; after: string }[]
  features: { slug: string; body: string }[]
  day: { time: string; title: string; body: string }[]
  faqs: { q: string; a: string }[]
  widgetTitle: string
  widgetBody: string
}

export const personas: Persona[] = [
  {
    slug: "artists",
    name: "Artists",
    short: "Plan the run, build the story.",
    icon: Mic2,
    accent: "purple",
    tagline: "Routing, profile and bookings in one place.",
    headline: ["Plan the run.", "Own the stage."],
    sub: "Route your tour, keep your EPK current and manage every booking conversation without leaving Tourify.",
    metaDescription:
      "Tourify for artists: tour routing, a living EPK, booking requests and messaging in one workspace.",
    pains: [
      { before: "Routing lives in spreadsheets and DMs", after: "One route and calendar that updates as dates change" },
      { before: "Your EPK is a PDF that is always out of date", after: "A live profile you update once" },
      { before: "Booking threads buried across inboxes", after: "Every request and reply in one place" },
    ],
    features: [
      { slug: "tours", body: "Lay out your run city by city and see gaps before they cost you." },
      { slug: "profiles-epk", body: "Share a link to your bio, media and music instead of an attachment." },
      { slug: "bookings", body: "Track each inquiry from first message to confirmed date." },
      { slug: "messaging", body: "Talk to venues, promoters and your team in context." },
      { slug: "discovery", body: "Find venues and opportunities that fit your sound." },
      { slug: "analytics", body: "See how your shows are performing across the run." },
    ],
    day: [
      { time: "Morning", title: "Review the route", body: "Check next week's drive and spot an open day worth filling." },
      { time: "Midday", title: "Answer a booking request", body: "Reply in the thread and move it to confirmed." },
      { time: "Afternoon", title: "Update the EPK", body: "Add new photos once. Every link stays current." },
      { time: "Night", title: "See how the show landed", body: "Open the event and check attendance against capacity." },
    ],
    faqs: [
      { q: "Do I need an artist account?", a: "Create an account and choose the type that fits you. Artist accounts get tour routing and EPK tools." },
      { q: "Can my manager see my route?", a: "You can invite team members so everyone works from the same calendar." },
      { q: "Is it free?", a: "The open beta is free with full product access. No credit card required." },
    ],
    widgetTitle: "Build a sample route",
    widgetBody: "Tap cities to add or remove stops. Everything shown is sample data.",
  },
  {
    slug: "tour-managers",
    name: "Tour managers",
    short: "Run the day sheet, not the group chat.",
    icon: Route,
    accent: "blue",
    tagline: "Schedules, crew and budget under control.",
    headline: ["Keep the tour", "on schedule."],
    sub: "Coordinate dates, crew and show-day details with one shared view the whole team can trust.",
    metaDescription:
      "Tourify for tour managers: shared day sheets, crew scheduling, logistics, bookings and messaging.",
    pains: [
      { before: "Day sheets sent as attachments that go stale", after: "One shared schedule that is always current" },
      { before: "Crew availability tracked by text", after: "Shifts and availability on a roster" },
      { before: "Budget in a separate spreadsheet", after: "Performance and spend visible beside the dates" },
    ],
    features: [
      { slug: "logistics", body: "Keep show-day schedules and assets in one shared place." },
      { slug: "tours", body: "See the whole run and how each leg connects." },
      { slug: "workforce", body: "Assign crew and track who is available." },
      { slug: "messaging", body: "Group threads for each show and each team." },
      { slug: "bookings", body: "Follow every date from inquiry to confirmation." },
      { slug: "analytics", body: "Compare shows to see what drives the numbers." },
    ],
    day: [
      { time: "Morning", title: "Share the day sheet", body: "Publish load-in, soundcheck and doors for the team." },
      { time: "Midday", title: "Confirm crew", body: "Check the roster and fill any open shift." },
      { time: "Afternoon", title: "Advance tomorrow", body: "Collect details from the next venue." },
      { time: "Night", title: "Settle and review", body: "Look at the night's numbers against plan." },
    ],
    faqs: [
      { q: "Can I manage several artists?", a: "You can work with the teams and events you are invited to." },
      { q: "Is logistics available today?", a: "Advancing and logistics tools are in development. Check the status badge on the feature page." },
      { q: "How does my crew join?", a: "Invite them by link. They create a profile and see their own schedule." },
    ],
    widgetTitle: "Day sheet and budget",
    widgetBody: "A sample show-day timeline and budget split. Everything shown is sample data.",
  },
  {
    slug: "venues",
    name: "Venues",
    short: "Fill the calendar, staff the night.",
    icon: Building2,
    accent: "fuchsia",
    tagline: "Bookings, ticketing and staff for your room.",
    headline: ["Run a fuller", "calendar."],
    sub: "Handle booking requests, sell tickets and schedule your team from one dashboard built for venues.",
    metaDescription:
      "Tourify for venues: booking requests, event creation, ticketing, staff scheduling and analytics.",
    pains: [
      { before: "Booking requests arrive by email, DM and phone", after: "A single pipeline with clear status" },
      { before: "Staff scheduled in a shared doc", after: "Shifts and onboarding in one roster" },
      { before: "Ticketing handled in another tool", after: "Events and tickets side by side" },
    ],
    features: [
      { slug: "bookings", body: "Review and answer requests from one pipeline." },
      { slug: "events", body: "Publish events with lineup, times and capacity." },
      { slug: "ticketing", body: "Sell tickets without a separate platform." },
      { slug: "workforce", body: "Schedule staff and onboard new hires." },
      { slug: "messaging", body: "Keep artist and promoter conversations in context." },
      { slug: "analytics", body: "See which nights perform and which do not." },
    ],
    day: [
      { time: "Morning", title: "Triage requests", body: "Accept, decline or follow up on new booking requests." },
      { time: "Midday", title: "Publish a show", body: "Create the event and open ticket sales." },
      { time: "Afternoon", title: "Staff the weekend", body: "Fill shifts and send invites." },
      { time: "Night", title: "Watch the room", body: "Check attendance against capacity." },
    ],
    faqs: [
      { q: "Can I list my room's details?", a: "Venue profiles let you present your room, capacity and contact details." },
      { q: "Can staff see only their own shifts?", a: "Invited staff get their own view of the schedule." },
      { q: "Do I need another ticketing tool?", a: "Ticketing is in the beta. Check the feature page for its current status." },
    ],
    widgetTitle: "Booking calendar and roster",
    widgetBody: "Click days to mark them booked and watch the staffing need change. Sample data.",
  },
  {
    slug: "event-organizers",
    name: "Event organizers",
    short: "From first idea to full house.",
    icon: CalendarDays,
    accent: "amber",
    tagline: "Tickets, teams and logistics for any event.",
    headline: ["Plan it once.", "Sell it out."],
    sub: "Build events, price ticket tiers, staff the day and watch capacity in real time.",
    metaDescription:
      "Tourify for event organizers: event creation, ticket tiers, staffing, logistics and analytics.",
    pains: [
      { before: "Ticket pricing modelled in a spreadsheet", after: "Tiers and capacity built into the event" },
      { before: "Volunteers and staff coordinated over chat", after: "A roster everyone can see" },
      { before: "Little visibility until the door opens", after: "Sales against capacity as they happen" },
    ],
    features: [
      { slug: "events", body: "Create and publish events with all the details." },
      { slug: "ticketing", body: "Build tiers and cap capacity to the room." },
      { slug: "workforce", body: "Schedule staff and volunteers across shifts." },
      { slug: "logistics", body: "Share the run of show with your team." },
      { slug: "analytics", body: "Follow sales and attendance in one view." },
      { slug: "discovery", body: "Be found by people looking for something to do." },
    ],
    day: [
      { time: "Weeks out", title: "Set up tiers", body: "Create ticket tiers and set the quantity for each." },
      { time: "Days out", title: "Staff the event", body: "Assign shifts and confirm availability." },
      { time: "Day of", title: "Run the show", body: "Share the schedule and keep an eye on capacity." },
      { time: "After", title: "Review", body: "Compare the result to your plan." },
    ],
    faqs: [
      { q: "Can I run multiple events?", a: "Yes. Manage them from one calendar and compare results." },
      { q: "Can I set multiple price tiers?", a: "Ticket tiers are part of the ticketing feature in the beta." },
      { q: "Can volunteers join?", a: "Invite anyone by link and assign them to shifts." },
    ],
    widgetTitle: "Ticket-tier builder",
    widgetBody: "Adjust price and quantity to see sample revenue and capacity. Sample data.",
  },
  {
    slug: "crew",
    name: "Crew and industry",
    short: "Find the work, show the skill.",
    icon: Wrench,
    accent: "emerald",
    tagline: "Shifts, gigs and a profile that gets you hired.",
    headline: ["Find the next", "good gig."],
    sub: "Build a professional profile, browse opportunities and keep your shifts organized.",
    metaDescription:
      "Tourify for crew and industry professionals: shift schedules, job opportunities, profiles and messaging.",
    pains: [
      { before: "Shifts confirmed over text", after: "A shift board you can check anytime" },
      { before: "Work found by word of mouth only", after: "Opportunities you can browse and apply to" },
      { before: "Your experience lives in your head", after: "A profile that shows what you do" },
    ],
    features: [
      { slug: "workforce", body: "See your shifts and claim open ones." },
      { slug: "discovery", body: "Browse opportunities across the industry." },
      { slug: "profiles-epk", body: "Show your skills, credits and contact details." },
      { slug: "messaging", body: "Talk directly with the people hiring." },
      { slug: "bookings", body: "Respond to requests for your services." },
      { slug: "events", body: "See the events you are working at a glance." },
    ],
    day: [
      { time: "Morning", title: "Check your shifts", body: "See this week's schedule at a glance." },
      { time: "Midday", title: "Browse new roles", body: "Look through the job feed." },
      { time: "Afternoon", title: "Reply to a message", body: "Confirm a gig with the person hiring." },
      { time: "Night", title: "Work the show", body: "Know where to be and when." },
    ],
    faqs: [
      { q: "Who is this for?", a: "Technicians, stagehands, production staff and other industry professionals." },
      { q: "Can I find paid work?", a: "Browse the opportunities posted by venues and organizers." },
      { q: "Is the job feed live?", a: "Discovery and jobs are in the beta. See the feature page for status." },
    ],
    widgetTitle: "Shift board and job feed",
    widgetBody: "Claim a sample shift and browse sample roles. Sample data.",
  },
  {
    slug: "promoters",
    name: "Promoters",
    short: "Move offers from pitch to sold out.",
    icon: Megaphone,
    accent: "rose",
    tagline: "A pipeline for every offer you make.",
    headline: ["Close more", "offers."],
    sub: "Track offers, manage the shows you promote and see results across your portfolio.",
    metaDescription:
      "Tourify for promoters: booking pipeline, events, ticketing, discovery and analytics.",
    pains: [
      { before: "Offers tracked across notes and email", after: "A visible pipeline with clear stages" },
      { before: "Little insight into past shows", after: "Results you can compare" },
      { before: "Hard to reach the right artists", after: "Search and message directly" },
    ],
    features: [
      { slug: "bookings", body: "Track every offer from outreach to confirmed." },
      { slug: "events", body: "Manage the shows you promote." },
      { slug: "ticketing", body: "Watch sales build toward capacity." },
      { slug: "discovery", body: "Find artists and venues to work with." },
      { slug: "analytics", body: "Compare shows to refine what you book." },
      { slug: "messaging", body: "Negotiate in threads tied to the offer." },
    ],
    day: [
      { time: "Morning", title: "Review the pipeline", body: "See which offers need a follow-up." },
      { time: "Midday", title: "Reach out", body: "Message an artist about an open date." },
      { time: "Afternoon", title: "Check ticket sales", body: "See how an upcoming show is pacing." },
      { time: "Evening", title: "Compare results", body: "Look at last weekend against the last five." },
    ],
    faqs: [
      { q: "Can I track multiple offers?", a: "Yes. Bookings give you a pipeline with a status on each." },
      { q: "Can I see past performance?", a: "Analytics compare the events in your account." },
      { q: "How do I find artists?", a: "Use discovery to browse and message artists and venues." },
    ],
    widgetTitle: "Offer pipeline",
    widgetBody: "Switch stages to see how a sample pipeline narrows. Sample data.",
  },
  {
    slug: "fans",
    name: "Fans",
    short: "Never miss the shows you love.",
    icon: Headphones,
    accent: "cyan",
    tagline: "Discover, follow and get tickets.",
    headline: ["Find your next", "favorite night."],
    sub: "Follow artists and venues, discover shows nearby and buy tickets in a few taps.",
    metaDescription:
      "Tourify for fans: discover local shows, follow artists and venues, and buy tickets.",
    pains: [
      { before: "Finding out about a show after it sold out", after: "Follow artists and see their dates" },
      { before: "Scattered links to buy tickets", after: "Tickets on the event page" },
      { before: "Hard to find local acts", after: "Browse by what is happening near you" },
    ],
    features: [
      { slug: "discovery", body: "Browse shows, artists and venues." },
      { slug: "events", body: "See lineups, times and details on one page." },
      { slug: "ticketing", body: "Buy tickets without leaving the event." },
      { slug: "profiles-epk", body: "Explore artist and venue profiles." },
      { slug: "tours", body: "See the cities an artist is visiting." },
      { slug: "messaging", body: "Join conversations with the community." },
    ],
    day: [
      { time: "Morning", title: "Check your feed", body: "See what the artists you follow posted." },
      { time: "Midday", title: "Find a show", body: "Browse what is on this weekend." },
      { time: "Afternoon", title: "Get tickets", body: "Pick a tier and check out." },
      { time: "Night", title: "Go", body: "Enjoy the show." },
    ],
    faqs: [
      { q: "Is it free for fans?", a: "Creating an account is free during the open beta." },
      { q: "Can I follow artists?", a: "Yes. Follow artists and venues to keep up with them." },
      { q: "Do I need an account to browse?", a: "Create a free account to follow, message and buy tickets." },
    ],
    widgetTitle: "Discovery feed",
    widgetBody: "Follow sample artists and toggle a show alert. Sample data.",
  },
]

export function getPersona(slug: string) {
  return personas.find((p) => p.slug === slug)
}
