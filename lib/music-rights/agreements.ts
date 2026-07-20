import { createHash } from "node:crypto"
import type { RationalShare } from "./rights-types"

export interface AgreementClaimSnapshotItem {
  claimId: string
  subjectType: string
  subjectId: string
  claimantPartyId: string
  claimType: string
  rightsCategory: string
  share: RationalShare
  territoryCodes: string[]
  perpetual: boolean
  status: string
}

export interface AgreementPartySnapshotItem {
  partyId: string
  displayName: string
  legalName?: string | null
  signerRole: string
  linkedUserId?: string | null
}

function stableObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableObject)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableObject(child)]),
    )
  }
  return value
}

export function canonicalizeAgreementPayload(value: unknown): string {
  return JSON.stringify(stableObject(value))
}

export function hashAgreementPayload(value: unknown): string {
  return createHash("sha256").update(canonicalizeAgreementPayload(value)).digest("hex")
}

export function buildClaimSnapshot(claims: AgreementClaimSnapshotItem[]): {
  snapshot: AgreementClaimSnapshotItem[]
  hash: string
} {
  const snapshot = [...claims].sort((left, right) => left.claimId.localeCompare(right.claimId))
  return { snapshot, hash: hashAgreementPayload(snapshot) }
}

export function buildPartySnapshot(parties: AgreementPartySnapshotItem[]): {
  snapshot: AgreementPartySnapshotItem[]
  hash: string
} {
  const snapshot = [...parties].sort((left, right) => {
    const role = left.signerRole.localeCompare(right.signerRole)
    return role !== 0 ? role : left.partyId.localeCompare(right.partyId)
  })
  return { snapshot, hash: hashAgreementPayload(snapshot) }
}

export function renderAgreementMarkdown(params: {
  templateMarkdown: string
  projectTitle: string
  claims: AgreementClaimSnapshotItem[]
  parties: AgreementPartySnapshotItem[]
}): { renderedMarkdown: string; renderedHash: string } {
  const claimTable = params.claims.length
    ? [
      "| Party | Category | Type | Share | Territories |",
      "| --- | --- | --- | --- | --- |",
      ...params.claims.map((claim) => {
        const party = params.parties.find((item) => item.partyId === claim.claimantPartyId)
        const share = claim.share.unknown
          ? "unknown"
          : `${claim.share.numerator}/${claim.share.denominator}`
        return `| ${party?.displayName || claim.claimantPartyId} | ${claim.rightsCategory} | ${claim.claimType} | ${share} | ${claim.territoryCodes.join(", ")} |`
      }),
    ].join("\n")
    : "_No claims attached._"

  const partyList = params.parties.length
    ? params.parties.map((party) => `- ${party.displayName} (${party.signerRole})`).join("\n")
    : "_No parties attached._"

  const renderedMarkdown = params.templateMarkdown
    .replaceAll("{{project_title}}", params.projectTitle)
    .replaceAll("{{claim_table}}", claimTable)
    .replaceAll("{{party_list}}", partyList)

  return {
    renderedMarkdown,
    renderedHash: hashAgreementPayload(renderedMarkdown),
  }
}

export function hashTemplateSource(bodyMarkdown: string): string {
  return createHash("sha256").update(bodyMarkdown).digest("hex")
}

export function createConsentText(version = "v1"): string {
  if (version === "v1") {
    return [
      "I confirm I have reauthenticated, have authority to sign for the named party,",
      "have reviewed the full agreement text (not only the summary),",
      "and consent to use electronic records and signatures for this transaction.",
    ].join(" ")
  }
  return `Consent text version ${version}`
}
