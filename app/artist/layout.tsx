import "./globals.css"

import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { AccountsSeed } from "@/components/account/accounts-seed"
import { loadUserAccountsForSession } from "@/lib/accounts/server-load-accounts"
import { ArtistLayoutClient } from "./artist-layout-client"

export default async function ArtistLayout({ children }: { children: ReactNode }) {
  const loaded = await loadUserAccountsForSession()

  if (!loaded) redirect("/login?redirectTo=%2Fartist")

  return (
    <>
      <AccountsSeed accounts={loaded.accounts} activeSession={loaded.activeSession} />
      <ArtistLayoutClient>{children}</ArtistLayoutClient>
    </>
  )
}
