import { redirect } from "next/navigation"

interface JobsLegacyRedirectPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function JobsLegacyRedirectPage({ searchParams }: JobsLegacyRedirectPageProps) {
  const resolved = (await searchParams) ?? {}
  const params = new URLSearchParams()
  params.set("tab", "jobs")

  for (const [key, value] of Object.entries(resolved)) {
    if (key === "tab") continue
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) params.append(key, entry)
      }
      continue
    }
    if (value) params.set(key, value)
  }

  redirect(`/admin/dashboard/hiring?${params.toString()}`)
}
