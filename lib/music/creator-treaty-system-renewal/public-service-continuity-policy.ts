export function determineContinuityMode(input: {
  authorityActive: boolean
  institutionOperating: boolean
  archiveAvailable: boolean
  essentialService: boolean
  replacementOperatorApproved: boolean
}) {
  if (!input.archiveAvailable) return 'halt_and_restore_archive' as const
  if (input.authorityActive && input.institutionOperating) return 'normal' as const
  if (input.essentialService && input.replacementOperatorApproved) return 'limited_successor_operation' as const
  return 'read_only_and_wind_down' as const
}
