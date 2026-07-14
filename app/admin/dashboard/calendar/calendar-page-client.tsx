'use client'

import { Suspense } from 'react'
import { AdminCalendarView } from '@/components/admin/admin-calendar-view'

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading calendar...</div>}>
      <AdminCalendarView showHeader showSubscribePanel />
    </Suspense>
  )
}
