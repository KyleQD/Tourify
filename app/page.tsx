import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TourifyLandingPage } from "@/components/marketing/tourify-landing-page"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/dashboard")
  return <TourifyLandingPage />
}
