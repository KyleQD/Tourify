/**
 * P14 — media review surface: staged audio/narration assets. Playback
 * eligibility is decided by the rights-resolved resolver, never here.
 */
import { getConsoleContext } from "@/lib/world/console/db"

export const dynamic = "force-dynamic"

interface MediaRow {
  id: string
  title: string | null
  asset_kind: string | null
}

export default async function MediaReview() {
  const { trusted } = await getConsoleContext()
  const { data, error } = await trusted
    .from("world_media_assets")
    .select("id,title,asset_kind")
    .order("title")
    .limit(100)

  if (error) {
    return <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">Media unavailable: {error.message}</p>
  }
  const rows = (data ?? []) as MediaRow[]

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">No media assets staged.</p>
        <p className="mt-1 text-xs text-slate-500">Approved instrument demos, narration, and archive audio appear here.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
          <tr><th className="px-4 py-2">Title</th><th className="px-4 py-2">Kind</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/5 text-slate-200">
              <td className="px-4 py-2">{row.title}</td>
              <td className="px-4 py-2 text-xs text-slate-400">{row.asset_kind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
