export type LogisticsReadinessState =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "ready"

export type LogisticsSourceStatus = "ready" | "degraded" | "unavailable"

export type LogisticsAttentionSeverity = "critical" | "high" | "medium" | "low"

export interface LogisticsSourceHealth {
  domain: string
  status: LogisticsSourceStatus
  generatedAt?: string
  warning?: string
}
