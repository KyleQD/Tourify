"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { SocialProvider } from "./context/social-context"
import { ProfileProvider } from "./context/profile-context"
import { useRouteAccountSync } from "@/hooks/use-route-account-sync"

function VenueRouteAccountSync({ children }: { children: React.ReactNode }) {
  useRouteAccountSync()
  return <>{children}</>
}

export function VenueProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SocialProvider>
        <ProfileProvider>
          <VenueRouteAccountSync>
            {children}
          </VenueRouteAccountSync>
        </ProfileProvider>
      </SocialProvider>
    </ThemeProvider>
  )
}
