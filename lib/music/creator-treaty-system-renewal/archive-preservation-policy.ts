export interface ArchivePackageCheck {
  manifestId: string
  checksumVerified: boolean
  provenanceComplete: boolean
  representationInfoComplete: boolean
  retentionAuthorized: boolean
  accessPurposeApproved: boolean
}

export function evaluateArchivePackage(input: ArchivePackageCheck) {
  const failures = Object.entries(input)
    .filter(([key, value]) => key !== 'manifestId' && value === false)
    .map(([key]) => key)
  return { accepted: failures.length === 0, failures }
}
