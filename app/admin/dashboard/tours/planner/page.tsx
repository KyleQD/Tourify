import { redirect } from "next/navigation"

interface TourPlannerRedirectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TourPlannerRedirectPage({
  searchParams,
}: TourPlannerRedirectPageProps) {
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

  // Canonical draft key used by Tour Builder
  const draft = query.get("draft") || query.get("id") || query.get("tour")
  if (draft) {
    query.set("draft", draft)
    query.delete("id")
    query.delete("tour")
  }

  const qs = query.toString()
  redirect(qs ? `/admin/dashboard/tours/builder?${qs}` : "/admin/dashboard/tours/builder")
}
