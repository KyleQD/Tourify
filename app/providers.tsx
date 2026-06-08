"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth"
import { SocialProvider } from "@/contexts/social-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SocialProvider>
          {children}
        </SocialProvider>
      </AuthProvider>
    </ThemeProvider>
  )
} 