import { apiRequest } from "@/lib/api/client"

export interface CreatorCapabilities {
  version: "v1"
  creatorType: string | null
  serviceOfferings: string[]
  productsForSale: string[]
  credentials: string[]
  workHighlights: string[]
  availableForHire: boolean
  collaborationInterest: boolean
  availability: string | null
  preferredContact: string | null
}

interface GetCreatorCapabilitiesResponse {
  capabilities: CreatorCapabilities
  top_skills: string[]
  endorsement_counts: Record<string, number>
  suggested: {
    credentials: string[]
    work_highlights: string[]
  }
}

interface UpdateCreatorCapabilitiesPayload {
  creatorType?: string
  serviceOfferings?: string[] | string
  productsForSale?: string[] | string
  credentials?: string[] | string
  workHighlights?: string[] | string
  availableForHire?: boolean
  collaborationInterest?: boolean
  availability?: string
  preferredContact?: string
}

export function getCreatorCapabilities() {
  return apiRequest<GetCreatorCapabilitiesResponse>("/api/settings/capabilities")
}

export function updateCreatorCapabilities(payload: UpdateCreatorCapabilitiesPayload) {
  return apiRequest<{ success: boolean; capabilities: CreatorCapabilities }>("/api/settings/capabilities", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}
