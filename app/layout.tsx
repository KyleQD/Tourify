import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/hooks/use-theme"
import { AuthProvider } from "@/contexts/auth-context"
import { MultiAccountProvider } from "@/hooks/use-multi-account"
import { Nav } from "@/components/nav"
import { Toaster } from "sonner"
import { warnMissingEnv } from "@/lib/utils/env-check"
// Demo mode removed for production

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tourify - Connect. Create. Tour.",
  description: "The ultimate platform for artists, venues, and music industry professionals",
  generator: 'Tourify Platform'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (process.env.NODE_ENV !== 'production') warnMissingEnv()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-indigo-950 to-slate-900 text-slate-100`}>
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <MultiAccountProvider>
              <div className="flex flex-col min-h-screen">
                <Nav />
                <main className="flex-1">
                  {children}
                </main>
                <Toaster richColors position="top-right" />
              </div>
            </MultiAccountProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}