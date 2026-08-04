import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database } from "lucide-react"

/**
 * Admin Dashboard Builder (orp-shell-create-tables): wont-fix for mutate UI.
 * Schema changes must go through additive Supabase migrations — never ad-hoc table creation.
 */
export default function CreateTablesDisabledPage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5 text-slate-400" />
            Table creation disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <p>
            This tool is intentionally disabled. Apply schema changes with additive migrations
            (`supabase/migrations`) and `supabase db push` — never reset or recreate tables from the UI.
          </p>
          <Button asChild variant="outline" className="border-slate-600 text-slate-200">
            <Link href="/admin/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
