import { redirect } from "next/navigation"

interface ManageArtistEventRedirectProps {
  params: Promise<{ id: string }>
}

export default async function ManageArtistEventRedirect({
  params,
}: ManageArtistEventRedirectProps) {
  const { id } = await params
  redirect(`/artist/events/${id}`)
}
