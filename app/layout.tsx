import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/hooks/use-theme"
import { AuthProvider } from "@/contexts/auth-context"
import { MandatoryTosGate } from "@/components/auth/mandatory-tos-gate"
import { MultiAccountProvider } from "@/hooks/use-multi-account"
import { ChunkLoadRecovery } from "@/components/chunk-load-recovery"
import { NavigationPerfMarks } from "@/components/performance/navigation-perf-marks"
import { AppChrome } from "@/components/layout/app-chrome"
import { Toaster } from "sonner"
import { warnMissingEnv, warnProductionPublicSiteUrl } from "@/lib/utils/env-check"
import { getMetadataBase } from "@/lib/seo/site"

const EducationRoot = dynamic(() =>
  import("@/components/product-education/education-root").then((mod) => ({ default: mod.EducationRoot }))
)

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
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
        <ChunkLoadRecovery />
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <MandatoryTosGate />
            <MultiAccountProvider>
              <EducationRoot>
                <NavigationPerfMarks />
                <AppChrome>{children}</AppChrome>
                <Toaster richColors position="top-right" />
              </EducationRoot>
            </MultiAccountProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
