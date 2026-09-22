/**
 * Admin Vocabulary
 *
 * Canonical terminology for all Admin domain labels.
 * Fixes: AUX-VOCAB-001 through AUX-VOCAB-020
 *
 * All UI strings for Admin domains should use these terms.
 * This prevents terminology drift across features.
 */

export const ADMIN_VOCABULARY = {
  // ─── Operations ──────────────────────────────────────────────────
  tour: "Tour",
  tours: "Tours",
  event: "Event",
  events: "Events",
  show: "Show",
  shows: "Shows",
  stop: "Stop",
  stops: "Stops",
  date: "Date",
  dates: "Dates",
  calendar: "Calendar",
  logistics: "Logistics",

  // ─── Workforce ───────────────────────────────────────────────────
  staff: "Staff",
  crew: "Crew",
  applicants: "Applicants",
  applications: "Applications",
  onboarding: "Onboarding",
  roster: "Roster",
  payroll: "Payroll",
  contractors: "Contractors",
  vendors: "Vendors",
  performers: "Performers",
  users: "Users",

  // ─── Commerce ────────────────────────────────────────────────────
  ticketing: "Ticketing",
  tickets: "Tickets",
  orders: "Orders",
  refunds: "Refunds",
  revenue: "Revenue",
  payouts: "Payouts",
  budgets: "Budgets",
  finances: "Finances",
  finance: "Finance",
  expense: "Expense",
  expenses: "Expenses",
  invoices: "Invoices",
  purchaseOrders: "Purchase Orders",
  contractRequests: "Contract Requests",

  // ─── Network ─────────────────────────────────────────────────────
  artists: "Artists",
  venues: "Venues",
  agencies: "Agencies",
  publications: "Publications",
  communications: "Communications",
  messages: "Messages",

  // ─── System ──────────────────────────────────────────────────────
  organization: "Organization",
  team: "Team",
  settings: "Settings",
  analytics: "Analytics",
  content: "Content",
  music: "Music",
  epk: "EPK",
  website: "Website",
  feed: "Feed",
  auditLog: "Audit Log",
  featureFlags: "Feature Flags",
  connect: "Connect",

  // ─── UI Labels ───────────────────────────────────────────────────
  overview: "Overview",
  details: "Details",
  summary: "Summary",
  filters: "Filters",
  search: "Search",
  actions: "Actions",
  export: "Export",
  import: "Import",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  create: "Create",
  edit: "Edit",
  view: "View",
  copy: "Copy",
  duplicate: "Duplicate",
  archive: "Archive",
  publish: "Publish",
  unpublish: "Unpublish",
  approve: "Approve",
  reject: "Reject",
  assign: "Assign",
  unassign: "Unassign",
  connect: "Connect",
  disconnect: "Disconnect",
  refresh: "Refresh",
  retry: "Retry",
  back: "Back",
  next: "Next",
  previous: "Previous",
  finish: "Finish",

  // ─── States ──────────────────────────────────────────────────────
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  inProgress: "In Progress",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
  refunded: "Refunded",

  // ─── Scope Labels ────────────────────────────────────────────────
  orgScope: "Organization",
  tourScope: "Tour",
  eventScope: "Event",
  globalScope: "Global",

  // ─── Empty States ────────────────────────────────────────────────
  noTours: "No tours yet",
  noToursDesc: "Create your first tour to get started.",
  noEvents: "No events yet",
  noEventsDesc: "Add events to your tour.",
  noStaff: "No staff assigned",
  noStaffDesc: "Assign staff to this event or tour.",
  noTickets: "No tickets on sale",
  noTicketsDesc: "Set up ticket types to start selling.",
  noFinance: "No financial data",
  noFinanceDesc: "Financial data will appear here once transactions are recorded.",
  noResults: "No results found",
  noResultsDesc: "Try adjusting your filters or search terms.",
  accessDenied: "Access Denied",
  accessDeniedDesc: "You do not have permission to view this resource.",
  dataUnavailable: "Data Unavailable",
  dataUnavailableDesc: "Unable to load data. This may be a temporary issue.",
} as const;

// ─── Pluralization Helper ────────────────────────────────────────────

export function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  // Simple pluralization — extend as needed
  if (word.endsWith("y")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s") || word.endsWith("sh") || word.endsWith("ch") || word.endsWith("x") || word.endsWith("z")) {
    return word + "es";
  }
  return word + "s";
}

// ─── Quantity Label ──────────────────────────────────────────────────

export function quantityLabel(count: number, singular: string, plural?: string): string {
  const p = plural ?? pluralize(singular, count);
  return count === 1 ? `1 ${singular}` : `${count} ${p}`;
}

// ─── Scope Label ─────────────────────────────────────────────────────

export function scopeLabel(scope: {
  orgName?: string;
  tourName?: string;
  eventName?: string;
}): string {
  const parts: string[] = [];
  if (scope.orgName) parts.push(scope.orgName);
  if (scope.tourName) parts.push(scope.tourName);
  if (scope.eventName) parts.push(scope.eventName);
  return parts.join(" / ");
}
