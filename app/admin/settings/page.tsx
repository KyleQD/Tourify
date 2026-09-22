import { redirect } from "next/navigation"

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/** Canonical organizer settings live under the dashboard shell */
export default async function AdminSettingsRedirectPage({ searchParams }: Props) {
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
  redirect(qs ? `/admin/dashboard/settings?${qs}` : "/admin/dashboard/settings")
}
