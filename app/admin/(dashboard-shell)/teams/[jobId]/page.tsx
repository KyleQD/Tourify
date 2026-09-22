import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ jobId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShellTeamsRedirect({ params, searchParams }: Props) {
  const { jobId } = await params
  const resolved: Record<string, string | string[] | undefined> = searchParams
    ? await searchParams
    : {}
  const query = new URLSearchParams()
  query.set("tab", "jobs")
  if (jobId) query.set("job_id", jobId)

  for (const [key, value] of Object.entries(resolved)) {
    if (key === "tab") continue
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) query.append(key, entry)
      }
      continue
    }
    if (typeof value === "string" && value) query.set(key, value)
  }

  redirect(`/admin/dashboard/hiring?${query.toString()}`)
}
