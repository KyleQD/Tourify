import { redirect } from "next/navigation"

interface EventPlannerRedirectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EventPlannerRedirectPage({
  searchParams,
}: EventPlannerRedirectPageProps) {
  const params = await searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) query.append(key, entry)
      }
      continue
    }
    if (value) query.set(key, value)
  }

  const draft = query.get("draft") || query.get("id") || query.get("event")
  if (draft) {
    query.set("draft", draft)
    query.delete("id")
    query.delete("event")
  }

  const qs = query.toString()
  redirect(qs ? `/admin/dashboard/events/create?${qs}` : "/admin/dashboard/events/create")
}
