export type IntelligencePurpose =
  | "private_diagnostics"
  | "aggregate_benchmarking"
  | "policy_research"
  | "contract_education"
  | "negotiation_readiness"
  | "collective_licensing_feasibility"

export interface ConsentScope {
  subjectId: string
  purpose: IntelligencePurpose
  dataCategories: string[]
  outputClasses: string[]
  effectiveAt: string
  expiresAt?: string | null
  jurisdiction?: string | null
}

export interface CohortPolicy {
  minimumParticipants: number
  minimumIndependentControllers: number
  maximumParticipantWeightBps: number
  minimumAgeDays: number
  suppressOutliers: boolean
}

export interface BenchmarkRelease {
  id: string
  metricVersionId: string
  cohortVersionId: string
  sourceWindowStart: string
  sourceWindowEnd: string
  status: "draft" | "review" | "published" | "revoked" | "superseded"
  descriptiveOnly: true
}
