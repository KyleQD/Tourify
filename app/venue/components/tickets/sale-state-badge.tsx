import { Badge } from "@/components/ui/badge"
import type { TicketSaleState } from "@/lib/ticketing/sale-state"

const STATE_STYLES: Record<TicketSaleState, string> = {
  draft: "border-yellow-600 text-yellow-500",
  scheduled: "border-zinc-600 text-zinc-300",
  sales_not_open: "border-sky-600 text-sky-400",
  on_sale: "bg-green-600 text-white border-transparent",
  paused: "border-orange-500 text-orange-400",
  sold_out: "border-red-500 text-red-400",
  ended: "border-zinc-700 text-zinc-500",
  cancelled: "border-red-800 text-red-500",
}

export function SaleStateBadge({ state, label }: { state: TicketSaleState; label?: string }) {
  return (
    <Badge variant="outline" className={STATE_STYLES[state]} title={label}>
      {label || state.replace(/_/g, " ")}
    </Badge>
  )
}
