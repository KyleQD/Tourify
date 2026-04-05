import { redirect } from "next/navigation"

export default async function LegacyVenuePublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  redirect(`/venues/${encodeURIComponent(username)}`)
}


