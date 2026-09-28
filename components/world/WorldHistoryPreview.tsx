import type { WorldHistoryEntity } from "@/lib/world/history/contracts"
import type { DraftWorldHistoryProjection } from "@/lib/world/history/project-pilot-profile"
import { getDraftEntityQuality } from "@/lib/world/history/quality"

function EntityList({ title, items }: { title: string; items: WorldHistoryEntity[] }) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article id={item.seed_id} key={item.seed_id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{item.entity_type.replaceAll("_", " ")}</span>
              {item.start_year ? <span>• {item.start_year}{item.end_year && item.end_year !== item.start_year ? `–${item.end_year}` : ""}</span> : null}
            </div>
            <h3 className="font-semibold text-foreground">{item.canonical_name}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.short_description}</p>
            {(() => { const quality = getDraftEntityQuality(item); return (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Draft · needs review</span><span>· confidence {Math.round(item.confidence * 100)}%</span>
                <span>· evidence quality {Math.round(quality.score * 100)}% ({quality.band.replaceAll("_", " ")})</span>
              </div>
            ) })()}
          </article>
        ))}
      </div>
    </section>
  )
}

function InstrumentList({ items }: { items: WorldHistoryEntity[] }) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Instruments & music technology</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const listenFor = Array.isArray(item.metadata.listen_for)
            ? item.metadata.listen_for.filter((value): value is string => typeof value === "string")
            : []
          const role = typeof item.metadata.sound_role === "string" ? item.metadata.sound_role : null
          return (
            <article id={item.seed_id} key={item.seed_id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Instrument / technology guide</div>
              <h3 className="mt-2 font-semibold text-foreground">{item.canonical_name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.short_description}</p>
              {role ? <div className="mt-3 text-sm"><span className="font-medium">Role:</span> <span className="text-muted-foreground">{role}</span></div> : null}
              {listenFor.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Listen for</div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {listenFor.map((trait) => <li key={trait}>• {trait}</li>)}
                  </ul>
                </div>
              ) : null}
              <div className="mt-3 text-xs text-muted-foreground">Audio example not cleared by default · confidence {Math.round(item.confidence * 100)}%</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function LandmarkList({ items }: { items: WorldHistoryEntity[] }) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Studios, venues & landmarks</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const type = typeof item.metadata.landmark_type === "string" ? item.metadata.landmark_type.replaceAll("_", " ") : null
          const address = typeof item.metadata.address_text === "string" ? item.metadata.address_text : null
          return (
            <article id={item.seed_id} key={item.seed_id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{type ?? "music landmark"}</div>
              <h3 className="mt-2 font-semibold text-foreground">{item.canonical_name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.short_description}</p>
              {address ? <div className="mt-3 text-xs text-muted-foreground">{address}</div> : null}
              <div className="mt-3 text-xs text-muted-foreground">Draft landmark record · confidence {Math.round(item.confidence * 100)}%</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}


function ArtistReferenceList({ items }: { items: WorldHistoryEntity[] }) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notable artists & groups</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const externalIds = item.metadata.external_ids && typeof item.metadata.external_ids === "object"
            ? item.metadata.external_ids as Record<string, unknown>
            : {}
          const mbid = typeof externalIds.musicbrainz_artist_mbid === "string" ? externalIds.musicbrainz_artist_mbid : null
          const qid = typeof externalIds.wikidata_qid === "string" ? externalIds.wikidata_qid : null
          const kind = typeof item.metadata.identity_kind === "string" ? item.metadata.identity_kind : "artist"
          return (
            <article id={item.seed_id} key={item.seed_id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{kind} · external knowledge identity</div>
              <h3 className="mt-2 font-semibold text-foreground">{item.canonical_name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.short_description}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {mbid ? <div>MusicBrainz identity resolved</div> : <div>MusicBrainz identity pending</div>}
                {qid ? <div>Wikidata identity resolved</div> : null}
                <div>No Tourify profile synthesized</div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RecordingList({ items }: { items: WorldHistoryEntity[] }) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notable recordings</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const artist = typeof item.metadata.artist_name === "string" ? item.metadata.artist_name : null
          const year = typeof item.metadata.release_year === "number" ? item.metadata.release_year : item.start_year
          return (
            <article id={item.seed_id} key={item.seed_id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Metadata reference · not playable by default</div>
              <h3 className="mt-2 font-semibold text-foreground">{item.canonical_name}</h3>
              <div className="mt-1 text-sm text-muted-foreground">{artist}{year ? ` · ${year}` : ""}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.short_description}</p>
              <div className="mt-3 text-xs text-muted-foreground">Rights unresolved · confidence {Math.round(item.confidence * 100)}%</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SoundSignatureList({ items }: { items: WorldHistoryEntity[] }) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">What to listen for</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const listenFor = Array.isArray(item.metadata.listen_for)
            ? item.metadata.listen_for.filter((value): value is string => typeof value === "string")
            : []
          return (
            <article id={item.seed_id} key={item.seed_id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="font-semibold text-foreground">{item.canonical_name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.short_description}</p>
              {listenFor.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {listenFor.map((trait) => <li key={trait}>• {trait}</li>)}
                </ul>
              ) : null}
              <div className="mt-3 text-xs text-muted-foreground">Listening guide · description only · confidence {Math.round(item.confidence * 100)}%</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RelationshipList({ data }: { data: DraftWorldHistoryProjection }) {
  if (data.relationships.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Connections</h2>
        <span className="text-xs text-muted-foreground">{data.relationships.length}</span>
      </div>
      <div className="space-y-2">
        {data.relationships.map((relation, index) => (
          <div key={`${relation.subjectSeedId}-${relation.relationKey}-${relation.objectSeedId}-${index}`} className="rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="font-medium">{relation.subjectName}</span>
            <span className="mx-2 text-muted-foreground">{relation.relationKey.replaceAll("_", " ")}</span>
            <span className="font-medium">{relation.objectName}</span>
            <span className="ml-2 text-xs text-muted-foreground">{Math.round(relation.confidence * 100)}%</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function WorldHistoryPreview({ data }: { data: DraftWorldHistoryProjection }) {
  return (
    <div className="space-y-8">
      <header className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">World of Music · internal preview</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{data.placePath}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{data.musicalIdentity}</p>
        <div className="mt-5 rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Research preview only. Nothing on this screen is public or approved until editorial review is complete.
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Entity evidence quality", data.quality.averageEntityQuality],
          ["Relationship evidence quality", data.quality.averageRelationshipQuality],
          ["Cross-domain corroboration", data.quality.corroboratedEntityRate],
          ["Stable artist identities", data.quality.stableArtistIdentityRate],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</div>
            <div className="mt-2 text-2xl font-semibold">{Math.round(Number(value) * 100)}%</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Suggested exploration path</div>
        <p className="mt-2 text-xs text-muted-foreground">Draft heuristic for preview navigation only; not an editorial ranking.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {data.suggestedExplorePath.map((item, index) => (
            <div key={`${item.role}-${item.seedId}`} className="rounded-xl border p-3">
              <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{index + 1}. {item.role.replaceAll("_", " ")}</div>
              <div className="mt-2 text-sm font-medium">{item.name}</div>
            </div>
          ))}
        </div>
      </section>

      {data.quality.gaps.length ? (
        <section className="rounded-2xl border border-dashed p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Known gaps</div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {data.quality.gaps.map((gap) => <li key={gap}>• {gap}</li>)}
          </ul>
        </section>
      ) : null}

      <EntityList title="History" items={data.timeline} />
      <EntityList title="Genres, scenes & context" items={data.genresAndScenes} />
      <InstrumentList items={data.instruments} />
      <SoundSignatureList items={data.soundSignatures} />
      <ArtistReferenceList items={data.notableArtists} />
      <RecordingList items={data.notableRecordings} />
      <RelationshipList data={data} />
      <LandmarkList items={data.landmarks} />

      <footer className="rounded-2xl border p-4 text-sm text-muted-foreground">
        Provenance sources attached: {data.provenance.sourceKeys.length}. Reviewed: no.
      </footer>
    </div>
  )
}
