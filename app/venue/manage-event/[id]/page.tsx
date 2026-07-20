import { redirect } from "next/navigation"

interface ManageEventRedirectProps {
  params: Promise<{ id: string }>
}

export default async function ManageEventRedirectPage({ params }: ManageEventRedirectProps) {
  const { id } = await params
  redirect(`/venue/events/${id}`)
}
