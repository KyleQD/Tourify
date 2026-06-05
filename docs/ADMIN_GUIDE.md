# Admin Dashboard Guide

This guide covers all sections of the Tourify admin dashboard for event coordinators and tour managers.

---

## Getting Started

Navigate to `/admin/dashboard` after signing in with an organizer account. The sidebar provides access to all sections.

---

## Sections

### Events
- **List** (`/admin/dashboard/events`) — All events with status, dates, capacity.
- **Planner** (`/admin/dashboard/events/planner`) — 8-step wizard to create and publish events: basics → venue & date → tickets → artists → team → schedule → logistics → review.
- **Event Detail** (`/admin/dashboard/events/[id]`) — Tabs: Overview, Tickets, Staff, Finances, Communications.
- **HQ** (`/admin/dashboard/events/[id]/hq`) — Real-time event command center.
- **Advancing** (`/admin/dashboard/events/[id]/advancing`) — Tech rider, hospitality, and logistics documents.
- **Day Sheet** (`/admin/dashboard/events/[id]/day-sheet`) — Auto-populated day-of schedule from event data.
- **Check-In** (`/admin/dashboard/events/[id]/check-in`) — Real-time ticket scanning / manual check-in.

### Tours
- **List** (`/admin/dashboard/tours`) — All tours with upcoming event count and status.
- **Planner** (`/admin/dashboard/tours/planner`) — Create a tour: name, dates, routing, team.
- **Tour Detail** (`/admin/dashboard/tours/[id]`) — Tabs: Events, Team, Finances, Calendar sync.

### Staff
- **Roster** (`/admin/dashboard/staff`) — All staff members, roles, shift counts.
- **Applications** (`/admin/applications`) — Incoming job applications, approve/reject/hire workflow.
- **RBAC** (`/admin/dashboard/rbac`) — Assign granular permissions per user or role.

### Finances
- **Overview** (`/admin/dashboard/finances`) — Transactions, budgets, P&L summary.
- **Settlements** — Create and mark settlements paid for each event.
- **Ticketing Refunds** — Issue refunds from the Ticketing section.

### Logistics
- **Site Maps** (`/admin/dashboard/logistics/site-maps-enhanced`) — Visual venue layout builder.
- **Equipment Tracker** — Real-time GPS tracking for backline and production equipment.
- **Vendor Dashboard** — Vendor contacts, contracts, and deliverables.

### Communications
- **Inbox** (`/admin/dashboard/communications`) — Unified inbox for all messages, group threads, and notifications.
- **Event Group Chats** — Per-event group threads visible from event detail → Communications tab.

### Directory
- **Artists** (`/admin/dashboard/artists`) — Artist profiles, metrics, CSV import.
- **Venues** (`/admin/dashboard/venues`) — Venue directory with hosted-event counts.
- **Network** (`/admin/dashboard/network`) — Manage follow/connection requests.

### Content
- **Feed** (`/admin/dashboard/feed`) — Compose announcements, moderate posts.
- **Content Library** (`/admin/dashboard/content`) — Approve, flag, or remove posts and music.
- **Analytics** (`/admin/dashboard/analytics`) — Stats with date range, CSV export, top performers.

### Settings
- **Feature Flags** (`/admin/dashboard/features`) — Toggle features and control rollout percentage.
- **Audit Log** (`/admin/dashboard/settings/audit`) — Paginated log of all admin actions.
- **Marketplace** (`/admin/dashboard/marketplace`) — Manage store orders and inventory.

---

## Key Workflows

### Publish an Event
1. Go to Events → Planner
2. Complete all 8 steps (name, venue, date, tickets required)
3. Click Publish → redirects to event detail with status `confirmed`

### Run Check-In
1. Go to event detail → Check-In tab (or direct URL)
2. Scan QR code or enter ticket code manually
3. System marks ticket as `checked_in = true` in real-time

### Create a Settlement
1. Go to Finances
2. Click "New Settlement" → select event → enter amounts
3. Mark as `paid` when funds are transferred

---

## Audit Trail

Every publish, transaction, hire, and feature-flag change is logged in the audit log at `/admin/dashboard/settings/audit`. Filter by entity type and date range.
