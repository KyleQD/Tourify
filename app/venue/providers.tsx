"use client"

import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SocialProvider } from "@/contexts/social-context"
import { ProfileProvider } from "./context/profile-context"
import { AccountRouteGuard } from "@/components/account/account-route-guard"

function VenueProvidersInner({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SocialProvider>
        <ProfileProvider>
          <AccountRouteGuard />
          {children}
        </ProfileProvider>
      </SocialProvider>
    </ThemeProvider>
  )
}

export function VenueProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <VenueProvidersInner>{children}</VenueProvidersInner>
    </Suspense>
  )
}
