/**
 * P14 — sources registry: provenance backbone for every published claim.
 */
import { getConsoleContext } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

interface SourceRow {
  source_key: string
  display_name: string | null
  source_type: string | null
}

export default async function SourcesReview() {
  const { trusted } = await getConsoleContext()
  const { data, error } = await trusted
    .from("world_sources")
    .select("source_key,display_name,source_type")
    .order("source_key")
    .limit(200)

  if (error) {
    return <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">Sources unavailable: {error.message}</p>
  }
  const rows = (data ?? []) as SourceRow[]

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">Source registry empty.</p>
        <p className="mt-1 text-xs text-slate-500">Every published claim must reference a registered source.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
          <tr><th className="px-4 py-2">Key</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source_key} className="border-t border-white/5 text-slate-200">
              <td className="px-4 py-2 font-mono text-xs">{row.source_key}</td>
              <td className="px-4 py-2">{row.display_name}</td>
              <td className="px-4 py-2 text-xs text-slate-400">{row.source_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
