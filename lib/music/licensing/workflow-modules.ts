import type { LicenseFamily } from "./licensing-domain"

export type WorkflowModule =
  | "sync"
  | "master"
  | "mechanical"
  | "derivative"
  | "ugc"
  | "live"
  | "brand"
  | "media"
  | "ai"
  | "other"

export interface ResolveWorkflowModuleInput {
  families: LicenseFamily[]
  aiFlagEnabled: boolean
}

export interface WorkflowModuleResolution {
  module: WorkflowModule
  blocked: boolean
  reason?: string
}

export function resolveWorkflowModule(input: ResolveWorkflowModuleInput): WorkflowModuleResolution {
  const families = new Set(input.families)
  if (families.has("ai_training") || families.has("ai_output") || families.has("synthetic_voice")) {
    if (!input.aiFlagEnabled)
      return { module: "ai", blocked: true, reason: "ai_licensing_flag_disabled" }
    return { module: "ai", blocked: false }
  }
  if (families.has("sync") || families.has("master_use")) return { module: "sync", blocked: false }
  if (families.has("mechanical")) return { module: "mechanical", blocked: false }
  if (families.has("sample") || families.has("interpolation") || families.has("derivative") || families.has("remix"))
    return { module: "derivative", blocked: false }
  if (families.has("ugc")) return { module: "ugc", blocked: false }
  if (families.has("live_event")) return { module: "live", blocked: false }
  if (families.has("brand")) return { module: "brand", blocked: false }
  if (families.has("podcast") || families.has("game") || families.has("trailer"))
    return { module: "media", blocked: false }
  return { module: "other", blocked: false }
}
