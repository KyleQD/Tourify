import { redirect } from "next/navigation"

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
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
  redirect(query ? `/admin/dashboard?${query}` : "/admin/dashboard")
}
