/**
 * P3-T06 — World projector interface with deterministic stages.
 * Implementations must be idempotent: the same scan input produces the same
 * fact set. Unknown/ambiguous resolutions fail closed into review candidates
 * (never guessed facts).
 */
import type { EntityKind } from "@/lib/world/contracts/v1"

export interface ScanRecord {
  entityKind: EntityKind
  entityTable: string
  entityId: string
  /** Free-form location hints gathered by the source adapter. */
  hints?: {
    city?: string | null
    admin1?: string | null
    country?: string | null
    countryCode?: string | null
    externalRefs?: Array<{ provider: string; externalId: string }>
  }
}

export type ResolutionStatus =
  | { status: "resolved"; placeId: string; confidence: number }
  | { status: "ambiguous"; placeIds: string[] }
  | { status: "unresolved" }

export interface ResolvedFact {
  entityKind: EntityKind
  entityTable: string
  entityId: string
  placeId: string
  relationDomain: string
  relationKey: string
  confidence: number
  visibility: "private" | "internal" | "public" | "aggregate_only"
  projectorVersion: string
}

export interface ReviewCandidate {
  entityKind: EntityKind
  entityTable: string
  entityId: string
  reason: "ambiguous" | "unresolved"
  placeIds?: string[]
}

/** Minimal storage contract — satisfied by Supabase or an in-memory store. */
export interface FactStore {
  findOpenFact(
    entityTable: string,
    entityId: string,
    placeId: string,
    relationKey: string,
  ): Promise<{ id: string } | null>
  insertFact(fact: ResolvedFact & { provenance?: Record<string, unknown> }): Promise<void>
  updateFact(id: string, patch: Partial<ResolvedFact>): Promise<void>
  retireFact(id: string): Promise<void>
  insertReviewCandidate(candidate: ReviewCandidate): Promise<void>
  findReviewCandidate(
    entityTable: string,
    entityId: string,
    reasonPrefix: string,
  ): Promise<{ id: string } | null>
  /** Open facts for same entity+relation excluding the given place (move detection). */
  findStaleFacts?(
    entityTable: string,
    entityId: string,
    relationKey: string,
    excludePlaceId: string,
  ): Promise<string[]>
}

export interface ProjectorReport {
  scanned: number
  resolved: number
  ambiguous: number
  unresolved: number
  upserted: number
  retired: number
  errors: number
}

export const PROJECTOR_VERSION = "world-projector-v1.0.0"

export interface WorldProjectorDeps {
  store: FactStore
  resolvePlace(record: ScanRecord): Promise<ResolutionStatus>
  relationFor(entityKind: EntityKind): { domain: string; key: string }
  now?: () => Date
}
