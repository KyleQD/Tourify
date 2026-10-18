import { DJ_WORLD_WIDTH } from '@/lib/arcade/dj-quest-level'
import type { DJChapter } from '@/lib/arcade/dj-world-tour'
import { getDJWorldFeatures } from '@/lib/arcade/dj-world-events'

/**
 * Playable-game progress map — diagrammatic, not a geographic map.
 * Landmark order and distances are fictionalized for gameplay.
 */
export function DJChapterRouteMap({
  chapter,
  progressPercent,
}: {
  chapter: DJChapter
  progressPercent: number
}) {
  const progress = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, progressPercent)) : 0
  const px = (x: number) => 58 + (Math.max(0, Math.min(DJ_WORLD_WIDTH, x)) / DJ_WORLD_WIDTH) * 788
  const playerX = 58 + 7.88 * progress
  const sideQuests = getDJWorldFeatures(chapter.id).filter(feature => feature.kind !== 'patio-lights')

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/15 bg-[#111127] p-3 sm:p-4" aria-label={chapter.name + ' gameplay route map'}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.13em] text-white">Chapter Map · {chapter.city}</h3>
          <p className="text-[11px] text-white/60">Illustrated game route · landmarks rearranged for fun, not travel directions</p>
        </div>
        <span className="rounded-full border border-white/15 px-2 py-1 text-xs font-bold text-white/80">{Math.round(progress)}% traveled</span>
      </div>
      <div className="overflow-x-auto rounded-lg" tabIndex={0} aria-label="Scrollable chapter progress map">
      <svg viewBox="0 0 900 148" className="block min-w-[720px] w-full" role="img"
        aria-label={'Route from the starting point through ' + chapter.scenery.map(stop => stop.name).join(', ') + ' to ' + chapter.name + '. Player progress ' + Math.round(progress) + ' percent.'}>
        <defs>
          <linearGradient id="dj-route-ocean" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.12" />
            <stop offset="100%" stopColor={chapter.accent} stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="900" height="148" rx="16" fill="url(#dj-route-ocean)" />
        <path d="M 58 89 L 846 89" fill="none"
          stroke="#ffffff33" strokeWidth="9" strokeLinecap="round" />
        <path d={'M 58 89 L ' + playerX + ' 89'} fill="none"
          stroke={chapter.accent} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <circle cx="58" cy="89" r="8" fill="#fef3c7" stroke="#111127" strokeWidth="3" />
        <text x="58" y="114" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700">START</text>
        {chapter.scenery.map((stop, i) => {
          const x = px(stop.x)
          const visited = stop.x / DJ_WORLD_WIDTH * 100 <= progress
          return <g key={stop.x + ':' + stop.name}>
            <circle cx={x} cy={89} r="10" fill={visited ? chapter.accent : '#1e293b'}
              stroke={chapter.accent} strokeWidth="3" />
            <circle cx={x} cy={89} r="3" fill="#fff" />
            <line x1={x} y1={i % 2 ? 100 : 78} x2={x} y2={i % 2 ? 117 : 50}
              stroke="#ffffff77" strokeDasharray="3 3" />
            <text x={x} y={i % 2 ? 132 : 32} textAnchor="middle"
              fill="#f8fafc" fontSize="11" fontWeight="600">
              {stop.name.length > 18 ? stop.name.slice(0, 17) + '…' : stop.name}
            </text>
          </g>
        })}
        {sideQuests.map(feature => {
          const x = px(feature.x)
          return <g key={feature.id}>
            <title>{feature.name}</title>
            <rect x={x - 6} y={66} width={12} height={12} rx={feature.kind === 'surf-hazard' ? 6 : 2}
              fill={feature.kind === 'surf-hazard' ? '#67e8f9' : '#fbbf24'} stroke="#1e293b" strokeWidth="2" />
            <path d={'M ' + x + ' 78 L ' + x + ' 83'} stroke="#f8fafc" strokeWidth="1.5" />
          </g>
        })}
        <circle cx="846" cy="89" r="12" fill={chapter.accent} stroke="#fff" strokeWidth="3" />
        <text x="846" y="115" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">CLUB</text>
        <g transform={'translate(' + playerX + ' 89)'}>
          <path d="M 0 -26 L -8 -11 L 8 -11 Z" fill="#fff8e7" stroke="#1a1731" strokeWidth="2" />
          <circle cx="0" cy="-29" r="5" fill="#fff8e7" />
        </g>
      </svg>
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/65">
        <span>◆ Your position</span>
        <span>● Inspired landmarks</span>
        <span>★ Final club</span>
        {sideQuests.length > 0 && <span>■ Gold = spring / bonus · ● Blue = surf obstacle</span>}
      </figcaption>
      {sideQuests.length > 0 && <p className="mt-2 text-xs leading-relaxed text-amber-100/90">EOS side quests: {sideQuests.map(feature => feature.name).join(' · ')}. Map locations reflect game-world progress, not street positions.</p>}
    </figure>
  )
}
