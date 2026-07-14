import { redirect } from "next/navigation"

export default function ArtistMerchandiseRedirectPage() {
  redirect("/artist/store?tab=listings&type=merch")
}
