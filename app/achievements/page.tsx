import { Suspense } from 'react'
import { AchievementsPageClient } from './achievements-page-client'

export default function AchievementsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 flex items-center justify-center">
          <div className="text-white text-lg">Loading achievements...</div>
        </div>
      }
    >
      <AchievementsPageClient />
    </Suspense>
  )
}
