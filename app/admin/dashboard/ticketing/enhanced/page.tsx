import { redirect } from "next/navigation"

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EnhancedTicketingRedirect({ searchParams }: Props) {
  const resolved = (await searchParams) ?? {}
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) params.append(key, entry)
      }
      continue
    }
    if (value) params.set(key, value)
  }

  const qs = params.toString()
  redirect(qs ? `/admin/dashboard/ticketing?${qs}` : "/admin/dashboard/ticketing")
}
