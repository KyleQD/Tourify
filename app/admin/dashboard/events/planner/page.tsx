import { redirect } from "next/navigation"

export default async function EventPlannerRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; id?: string }>
}) {
  const params = await searchParams
  const draft = params.draft || params.id
  const query = draft ? `?draft=${encodeURIComponent(draft)}` : ""
  redirect(`/admin/dashboard/events/create${query}`)
}
