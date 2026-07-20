export function formatTicketPriceLabel({
  ticketPriceMin,
  ticketPriceMax,
}: {
  ticketPriceMin?: number | null
  ticketPriceMax?: number | null
}): string {
  const min =
    typeof ticketPriceMin === "number" && Number.isFinite(ticketPriceMin)
      ? ticketPriceMin
      : null
  const max =
    typeof ticketPriceMax === "number" && Number.isFinite(ticketPriceMax)
      ? ticketPriceMax
      : null

  if (min === null && max === null) return "Tickets TBA"
  if (min === 0 && (max === null || max === 0)) return "Free"
  if (min !== null && max !== null && min !== max)
    return `$${formatMoney(min)}–$${formatMoney(max)}`
  const value = min ?? max
  if (value === 0) return "Free"
  return `$${formatMoney(value as number)}`
}

function formatMoney(value: number) {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/\.00$/, "")
}
