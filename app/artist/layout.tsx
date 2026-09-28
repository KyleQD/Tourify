import "./globals.css"

import { ReactNode } from "react"
import { AccountsSeed } from "@/components/account/accounts-seed"
import { loadUserAccountsForSession } from "@/lib/accounts/server-load-accounts"
import { ArtistLayoutClient } from "./artist-layout-client"

export default async function ArtistLayout({ children }: { children: ReactNode }) {
  const loaded = await loadUserAccountsForSession()

  // Middleware protects artist tools while allowing /artist/[slug] public pages.
  // Anonymous public visitors do not need an account shell or redirect here.
  if (!loaded) return <>{children}</>

  return (
    <>
      <AccountsSeed accounts={loaded.accounts} activeSession={loaded.activeSession} />
      <ArtistLayoutClient>{children}</ArtistLayoutClient>
    </>
  )
}
