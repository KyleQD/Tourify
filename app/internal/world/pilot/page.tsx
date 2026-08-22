import Link from "next/link"
import { notFound } from "next/navigation"
import { getWorldHistoryRepository } from "@/lib/world/history/static-pilot-repository"
import { projectDraftWorldHistory } from "@/lib/world/history/project-pilot-profile"
import { searchWorldHistory } from "@/lib/world/history/search"

export const dynamic = "force-dynamic"

export default async function WorldPilotIndexPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") notFound()
  const { q = "" } = await searchParams
  const repository = getWorldHistoryRepository()
  const pilotKeys = await repository.listPilotKeys()
  const pilots = (await Promise.all(pilotKeys.map(async (key) => {
    const snapshot = await repository.getPlaceKnowledgeByKey(key)
    return snapshot ? projectDraftWorldHistory(snapshot) : null
  }))).filter((value): value is NonNullable<typeof value> => Boolean(value))
  const results = q.trim() ? searchWorldHistory({ query: q, limit: 30 }) : []

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header>
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">World of Music · internal</div>
        <h1 className="mt-2 text-3xl font-semibold">Pilot World Explorer</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">Draft research profiles only. Quality scores prioritize review; they never publish cultural claims or authorize playback.</p>
      </header>

      <form className="flex gap-2" action="/internal/world/pilot" method="get">
        <input name="q" defaultValue={q} maxLength={160} placeholder="Search artists, recordings, scenes, sounds, instruments…" className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 text-sm" />
        <button className="rounded-xl border bg-card px-5 py-3 text-sm font-medium" type="submit">Search</button>
      </form>

      {q.trim() ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Search results for “{q}”</h2><span className="text-sm text-muted-foreground">{results.length}</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((result) => (
              <Link key={result.id} href={`/internal/world/pilot/${result.pilotKey}#${result.id}`} className="rounded-2xl border bg-card p-4 hover:bg-muted/40">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{result.pilotKey} · {result.kind.replaceAll("_", " ")}</div>
                <div className="mt-2 font-semibold">{result.name}</div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{result.summary}</p>
                <div className="mt-3 text-xs text-muted-foreground">Draft evidence quality {Math.round(result.qualityScore * 100)}% · {result.sourceCount} source key{result.sourceCount === 1 ? "" : "s"} · {result.graphDegree} graph link{result.graphDegree === 1 ? "" : "s"}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Pilot regions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pilots.map((pilot) => (
            <Link key={pilot.pilotKey} href={`/internal/world/pilot/${pilot.pilotKey}`} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:bg-muted/40">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Pilot region</div>
              <div className="mt-2 text-lg font-semibold capitalize">{pilot.pilotKey}</div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{pilot.musicalIdentity}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Evidence {Math.round(pilot.quality.averageEntityQuality * 100)}%</div>
                <div>Corroborated {Math.round(pilot.quality.corroboratedEntityRate * 100)}%</div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">Open research profile →</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
