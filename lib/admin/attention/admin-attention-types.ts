/**
 * Admin Attention / Reminder System
 *
 * Proactive, triaged attention system replacing buried Notifications center.
 * Fixes: AUX-ATTN-001 through AUX-ATTN-005, AUX-NOTIF-001 through AUX-NOTIF-004
 *
 * Attention items are organized by priority and time, not by subsystem.
 * Every item has a clear action and context.
 */

// ─── Attention Item Types ────────────────────────────────────────────

export type AttentionPriority = "high" | "medium" | "low";

export type AttentionCategory =
  | "approval"       // Requires human decision
  | "deadline"       // Time-sensitive action needed
  | "error"          // Something failed
  | "reminder"       // Optional but useful
  | "update";        // Status change notification

export interface AttentionItem {
  id: string;
  category: AttentionCategory;
  priority: AttentionPriority;
  title: string;
  description: string;
  /** Domain where this item lives */
  domain: string;
  /** Route to the affected entity */
  href: string;
  /** When this item was created */
  createdAt: string;
  /** Optional deadline */
  deadline?: string;
  /** Whether this has been read */
  read: boolean;
  /** Whether this has been acted upon */
  acted: boolean;
  /** The entity this relates to */
  entity?: {
    type: string;
    id: string;
    name: string;
  };
  /** Available actions */
  actions?: AttentionAction[];
}

export interface AttentionAction {
  id: string;
  label: string;
  variant?: "default" | "destructive" | "outline";
  /** Whether this is the primary action */
  primary?: boolean;
  /** Route to navigate to for this action */
  href?: string;
  /** Callback for this action */
  onClick?: () => void;
}

// ─── Attention State ─────────────────────────────────────────────────

export type AttentionState =
  | { status: "loading" }
  | { status: "ready"; items: AttentionItem[]; unreadCount: number }
  | { status: "unavailable" };

// ─── Attention Helpers ───────────────────────────────────────────────

/**
 * Sort attention items by priority, then by creation time.
 * High priority first, newest first within same priority.
 */
export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  const priorityOrder: Record<AttentionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...items].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filter attention items by category.
 */
export function filterByCategory(
  items: AttentionItem[],
  category: AttentionCategory
): AttentionItem[] {
  return items.filter((item) => item.category === category);
}

/**
 * Filter attention items by domain.
 */
export function filterByDomain(
  items: AttentionItem[],
  domain: string
): AttentionItem[] {
  return items.filter((item) => item.domain === domain);
}

/**
 * Get unread count for attention items.
 */
export function getUnreadCount(items: AttentionItem[]): number {
  return items.filter((item) => !item.read).length;
}

/**
 * Get items requiring action (high priority, unread, not acted).
 */
export function getActionRequired(items: AttentionItem[]): AttentionItem[] {
  return items.filter(
    (item) => item.priority === "high" && !item.read && !item.acted
  );
}

/**
 * Get items with upcoming deadlines (within next 24 hours).
 */
export function getUpcomingDeadlines(items: AttentionItem[]): AttentionItem[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return items.filter((item) => {
    if (!item.deadline) return false;
    const deadline = new Date(item.deadline);
    return deadline > now && deadline < tomorrow;
  });
}

/**
 * Group attention items by category for display.
 */
export function groupByCategory(
  items: AttentionItem[]
): Record<AttentionCategory, AttentionItem[]> {
  const groups: Record<AttentionCategory, AttentionItem[]> = {
    approval: [],
    deadline: [],
    error: [],
    reminder: [],
    update: [],
  };

  for (const item of items) {
    groups[item.category].push(item);
  }

  return groups;
}

/**
 * Group attention items by domain for display.
 */
export function groupByDomain(
  items: AttentionItem[]
): Record<string, AttentionItem[]> {
  const groups: Record<string, AttentionItem[]> = {};

  for (const item of items) {
    if (!groups[item.domain]) {
      groups[item.domain] = [];
    }
    groups[item.domain].push(item);
  }

  return groups;
}

// ─── Attention Display Helpers ───────────────────────────────────────

export function formatPriority(priority: AttentionPriority): string {
  switch (priority) {
    case "high": return "High Priority";
    case "medium": return "Medium Priority";
    case "low": return "Low Priority";
  }
}

export function formatCategory(category: AttentionCategory): string {
  switch (category) {
    case "approval": return "Approval Needed";
    case "deadline": return "Deadline";
    case "error": return "Error";
    case "reminder": return "Reminder";
    case "update": return "Update";
  }
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function timeUntil(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = date.getTime() - now.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 0) return "overdue";
  if (seconds < 60) return "in less than a minute";
  if (minutes < 60) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  if (days < 7) return `in ${days}d`;
  return date.toLocaleDateString();
}
