import searchIndexData from "@/data/world/reference/search-index.json"

export interface WorldSearchRow {
  id: string
  pilotKey: string
  placePath: string
  kind: string
  name: string
  summary: string
  qualityScore: number
  yearStart: number | null
  yearEnd: number | null
  sourceCount: number
  graphDegree: number
  searchText: string
}

export interface WorldSearchResult extends Omit<WorldSearchRow, "searchText"> {
  score: number
}

const rows = (searchIndexData as { rows: WorldSearchRow[] }).rows

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function searchWorldHistory(input: {
  query: string
  pilotKey?: string | null
  kind?: string | null
  limit?: number
}): WorldSearchResult[] {
  const query = normalize(input.query).slice(0, 160)
  if (!query) return []
  const tokens = query.split(/\s+/).filter(Boolean).slice(0, 12)
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50))

  return rows
    .filter((row) => !input.pilotKey || row.pilotKey === input.pilotKey)
    .filter((row) => !input.kind || row.kind === input.kind)
    .map((row) => {
      const name = normalize(row.name)
      const body = row.searchText
      let score = row.qualityScore * 10 + Math.min(row.graphDegree, 5) * 1.5
      if (name === query) score += 100
      else if (name.startsWith(query)) score += 60
      else if (name.includes(query)) score += 35
      let matched = 0
      for (const token of tokens) {
        if (name.includes(token)) { score += 12; matched += 1 }
        else if (body.includes(token)) { score += 4; matched += 1 }
      }
      if (matched !== tokens.length) score -= (tokens.length - matched) * 15
      return { row, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.row.qualityScore - a.row.qualityScore || a.row.name.localeCompare(b.row.name))
    .slice(0, limit)
    .map(({ row, score }) => ({
      id: row.id,
      pilotKey: row.pilotKey,
      placePath: row.placePath,
      kind: row.kind,
      name: row.name,
      summary: row.summary,
      qualityScore: row.qualityScore,
      yearStart: row.yearStart,
      yearEnd: row.yearEnd,
      sourceCount: row.sourceCount,
      graphDegree: row.graphDegree,
      score: Math.round(score * 100) / 100,
    }))
}
