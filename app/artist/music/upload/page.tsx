import { redirect } from "next/navigation"

/** Nav links use `/artist/music/upload`; upload UI lives on `/artist/music`. */
export default function ArtistMusicUploadPage() {
  redirect("/artist/music?upload=1")
}
