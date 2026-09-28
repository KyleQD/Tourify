import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

/**
 * Admin Dashboard Builder (orp-shell-reset-onboarding): wont-fix for destructive wipe.
 */
export default function ResetOnboardingDisabledPage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Onboarding reset disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <p>
            Destructive onboarding resets are disabled here to protect local and shared data.
            Manage templates and candidates from the Hiring Hub instead.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Link href="/admin/dashboard/hiring/templates">Hiring templates</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200">
              <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
