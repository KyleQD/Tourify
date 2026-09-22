import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Terminal } from "lucide-react"

/**
 * Admin Dashboard Builder (orp-shell-setup): wont-fix for ad-hoc SQL setup UI.
 */
export default function SetupDisabledPage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Terminal className="h-5 w-5 text-slate-400" />
            Setup tool disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <p>
            Use Supabase migrations for schema setup. This page no longer runs SQL from the browser.
          </p>
          <Button asChild variant="outline" className="border-slate-600 text-slate-200">
            <Link href="/admin/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
