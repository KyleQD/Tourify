import { CalendarDays, Download, Landmark, LockKeyhole, ReceiptText, Users } from "lucide-react"

import { AdminEmptyState } from "../components/admin-empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkforceHero } from "@/components/hiring/workforce-ui"

const SUMMARY_CARDS = [
  { label: "Gross payroll", icon: Landmark },
  { label: "Team members", icon: Users },
  { label: "Hours approved", icon: CalendarDays },
  { label: "Reimbursements", icon: ReceiptText },
]

export default function PayrollPage() {
  return (
    <div className="space-y-5">
      <WorkforceHero
        eyebrow="Staff Operations"
        title="Payroll workspace"
        description="Review pay periods, approval status, payroll batches, and export readiness once a payroll provider is connected."
        badge="Design preview"
        actions={
          <Button disabled className="bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-50">
            <Download className="mr-2 h-4 w-4" />
            Export payroll
          </Button>
        }
      />

      <Card className="border-slate-800 bg-slate-950/70 text-slate-100 shadow-xl shadow-slate-950/20">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            Pay period
            <select disabled className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm normal-case tracking-normal text-slate-500">
              <option>Connect payroll to select a period</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            Status
            <select disabled className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm normal-case tracking-normal text-slate-500">
              <option>All statuses</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button disabled variant="outline" className="h-10 w-full border-slate-700 bg-slate-900 text-slate-500">
              <LockKeyhole className="mr-2 h-4 w-4" />
              Create pay run
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Payroll summary">
        {SUMMARY_CARDS.map(({ label, icon: Icon }) => (
          <Card key={label} className="border-slate-800 bg-slate-950/70 text-slate-100">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-500" aria-label={`${label} unavailable`}>—</p>
              </div>
              <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-2.5 text-purple-300">
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-slate-800 bg-slate-950/70 text-slate-100">
        <CardHeader className="border-b border-slate-800/80">
          <CardTitle className="text-base">Payroll batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-800 px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 md:grid">
            <span>Pay period</span><span>Status</span><span>People</span><span>Total</span><span>Export</span>
          </div>
          <div className="p-6">
            <AdminEmptyState
              icon={LockKeyhole}
              title="Payroll data is not connected yet"
              description="Connect a payroll provider before reviewing pay runs, totals, or exports. This page does not load or simulate payroll data."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
