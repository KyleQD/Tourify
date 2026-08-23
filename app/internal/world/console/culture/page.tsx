/**
 * P14 — culture surface: curated cultural entities + relationships overview.
 */
import { getConsoleContext } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

interface EntityRow {
  id: string
  entity_kind: string | null
  name: string | null
}

export default async function CultureReview() {
  const { trusted } = await getConsoleContext()

  const [entities, relationships] = await Promise.all([
    trusted.from("world_cultural_entities").select("id,entity_kind,name").order("name").limit(100),
    trusted.from("world_cultural_relationships").select("id", { count: "exact", head: true }),
  ])

  const rows = (entities.data ?? []) as EntityRow[]
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">No cultural entities staged.</p>
        <p className="mt-1 text-xs text-slate-500">Genre/scene/movement corpora appear here after governed promotion.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
            <tr><th className="px-4 py-2">Entity</th><th className="px-4 py-2">Kind</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5 text-slate-200">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-xs text-slate-400">{row.entity_kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{relationships.count ?? 0} registered relationships.</p>
    </div>
  )
}
