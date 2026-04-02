/** Full class strings so Tailwind JIT can detect every utility (dynamic `bg-${color}-...` is not scanned). */
const BADGE_CLASS_BY_COLOR: Record<string, string> = {
  green: "bg-green-500/20 text-green-400 border border-green-500/30",
  blue: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border border-red-500/30",
  slate: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
}

export function getStatusBadgeClass(color: string): string {
  return BADGE_CLASS_BY_COLOR[color] ?? BADGE_CLASS_BY_COLOR.slate
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "green",
    confirmed: "green",
    completed: "green",
    live: "green",
    published: "green",
    scheduled: "blue",
    in_progress: "blue",
    planning: "yellow",
    draft: "yellow",
    pending: "yellow",
    inquiry: "yellow",
    cancelled: "red",
    rejected: "red",
    failed: "red",
    inactive: "slate",
    archived: "slate",
  }
  return map[status?.toLowerCase()] || "slate"
}

export function statusBadgeClass(status: string): string {
  return getStatusBadgeClass(getStatusColor(status))
}
