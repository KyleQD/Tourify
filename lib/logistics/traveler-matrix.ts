export interface TravelerMatrixMember {
  id: string
  name: string
  email?: string | null
}

export interface TravelerMatrixInputs {
  members: TravelerMatrixMember[]
  flightMemberIds: string[]
  lodgingMemberIds: string[]
  transferMemberIds: string[]
}

export interface TravelerMatrixRow {
  memberId: string
  name: string
  email?: string | null
  hasFlight: boolean
  hasLodging: boolean
  hasTransfer: boolean
  gaps: Array<'flight' | 'lodging' | 'transfer'>
}

export function buildTravelerMatrix(inputs: TravelerMatrixInputs): {
  rows: TravelerMatrixRow[]
  missingFlight: number
  missingLodging: number
  missingTransfer: number
  fullyCovered: number
} {
  const flightSet = new Set(inputs.flightMemberIds)
  const lodgingSet = new Set(inputs.lodgingMemberIds)
  const transferSet = new Set(inputs.transferMemberIds)

  const rows = inputs.members.map((member) => {
    const hasFlight = flightSet.has(member.id)
    const hasLodging = lodgingSet.has(member.id)
    const hasTransfer = transferSet.has(member.id)
    const gaps: Array<'flight' | 'lodging' | 'transfer'> = []
    if (!hasFlight) gaps.push('flight')
    if (!hasLodging) gaps.push('lodging')
    if (!hasTransfer) gaps.push('transfer')
    return {
      memberId: member.id,
      name: member.name,
      email: member.email,
      hasFlight,
      hasLodging,
      hasTransfer,
      gaps,
    }
  })

  return {
    rows,
    missingFlight: rows.filter((r) => !r.hasFlight).length,
    missingLodging: rows.filter((r) => !r.hasLodging).length,
    missingTransfer: rows.filter((r) => !r.hasTransfer).length,
    fullyCovered: rows.filter((r) => r.gaps.length === 0).length,
  }
}
