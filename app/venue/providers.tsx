"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { SocialProvider } from "./context/social-context"
import { ProfileProvider } from "./context/profile-context"

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
          {children}
        </ProfileProvider>
      </SocialProvider>
    </ThemeProvider>
  )
}
