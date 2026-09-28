import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile | Tourify",
  description: "Manage your profile settings and preferences",
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No container here — public /profile/[username] needs a full-bleed hero.
  // The management page at /profile adds its own padding.
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {children}
    </div>
  )
} 