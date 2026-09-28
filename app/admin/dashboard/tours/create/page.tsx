import { redirect } from "next/navigation"

interface TourCreatePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function TourCreatePage({ searchParams }: TourCreatePageProps) {
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

  const query = params.toString()
  redirect(query ? `/admin/dashboard/tours/builder?${query}` : "/admin/dashboard/tours/builder")
}
