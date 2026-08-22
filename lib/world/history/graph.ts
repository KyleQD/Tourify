import graphIndexData from "@/data/world/reference/graph-index.json"

interface GraphNeighbor {
  id: string
  name: string
  kind: string
  relationKey: string
  direction: "in" | "out"
  confidence: number
  qualityScore: number
}

interface GraphEntityIndexRow {
  id: string
  pilotKey: string
  placePath: string
  kind: string
  name: string
  neighbors: GraphNeighbor[]
}

const entities = (graphIndexData as { entities: Record<string, GraphEntityIndexRow> }).entities

export function getWorldGraphEntity(id: string): GraphEntityIndexRow | null {
  return entities[id] ?? null
}

export function getWorldRelatedEntities(id: string, limit = 12): GraphNeighbor[] {
  const row = entities[id]
  if (!row) return []
  return row.neighbors.slice(0, Math.max(1, Math.min(limit, 50)))
}
