import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/hooks/use-theme"
import { AuthProvider } from "@/contexts/auth-context"
import { MandatoryTosGate } from "@/components/auth/mandatory-tos-gate"
import { MultiAccountProvider } from "@/hooks/use-multi-account"
import { JukeboxProvider } from "@/contexts/jukebox-context"
import { Nav } from "@/components/nav"
import { PersistentPlayerBar } from "@/components/jukebox/persistent-player-bar"
import { FullPlayerView } from "@/components/jukebox/full-player-view"
import { EducationRoot } from "@/components/product-education/education-root"
import { Toaster } from "sonner"
import { warnMissingEnv, warnProductionPublicSiteUrl } from "@/lib/utils/env-check"

const inter = Inter({ subsets: ["latin"] })
const metadataBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://demo.tourify.live"

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: "Tourify - Connect. Create. Tour.",
    template: "%s | Tourify",
  },
  description:
    "Tourify is the live-music network for artists, venues, and teams — gigs, logistics, messaging, and fan moments in one place.",
  generator: "Tourify Platform",
  applicationName: "Tourify",
  openGraph: {
    type: "website",
    siteName: "Tourify",
    title: "Tourify - Connect. Create. Tour.",
    description:
      "Showcase your work, book shows, run logistics, and keep your crew aligned — built for the people who put rooms in the palm of their hands.",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Tourify — live music network for artists, venues, and crews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tourify - Connect. Create. Tour.",
    description:
      "Showcase your work, book shows, run logistics, and keep your crew aligned — built for the people who put rooms in the palm of their hands.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
    shortcut: ["/icon"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (process.env.NODE_ENV !== "production") warnMissingEnv()
  warnProductionPublicSiteUrl()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-indigo-950 to-slate-900 text-slate-100`}>
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <MandatoryTosGate />
            <MultiAccountProvider>
              <JukeboxProvider>
                <EducationRoot>
                  <div className="flex flex-col min-h-screen">
                    <Nav />
                    <main className="flex-1 pb-[var(--player-height,0px)]">
                      {children}
                    </main>
                    <PersistentPlayerBar />
                    <FullPlayerView />
                    <Toaster richColors position="top-right" />
                  </div>
                </EducationRoot>
              </JukeboxProvider>
            </MultiAccountProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}