export interface FederationServiceEndpoint {
  organizationId: string
  service: string
  jurisdictions: string[]
  credentialProfiles: string[]
  status: "active" | "suspended" | "retired"
  url: string
}

export function discoverFederationService(input: { endpoints: FederationServiceEndpoint[]; service: string; jurisdiction: string; credentialProfile: string }): FederationServiceEndpoint[] {
  return input.endpoints.filter((endpoint) => endpoint.status === "active" && endpoint.service === input.service && endpoint.jurisdictions.includes(input.jurisdiction) && endpoint.credentialProfiles.includes(input.credentialProfile))
}
