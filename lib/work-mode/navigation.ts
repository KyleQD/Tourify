import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Contact,
  FileText,
  Map,
  Megaphone,
  Plane,
  ReceiptText,
  WalletCards,
} from "lucide-react"

export const WORK_MODE_VIEWS = [
  { id: "today", label: "Today", icon: Clock3 },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ClipboardCheck },
  { id: "updates", label: "Updates", icon: Megaphone },
  { id: "maps", label: "Maps", icon: Map },
  { id: "day-sheet", label: "Day Sheet", icon: ReceiptText },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "pay", label: "Pay", icon: WalletCards },
  { id: "contacts", label: "Contacts", icon: Contact },
  { id: "check-in", label: "Check-in", icon: CheckCircle2 },
] as const

export type WorkModeView = (typeof WORK_MODE_VIEWS)[number]["id"]

export function isWorkModeView(value: string): value is WorkModeView {
  return WORK_MODE_VIEWS.some((view) => view.id === value)
}
