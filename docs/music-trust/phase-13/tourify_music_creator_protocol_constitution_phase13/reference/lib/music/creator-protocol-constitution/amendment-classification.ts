import type { AmendmentClass } from "./constitutional-domain"

export interface AmendmentEffects {
  changesFundamentalRight: boolean
  changesReservedPower: boolean
  breaksInteroperability: boolean
  changesOperatorConfigurationOnly: boolean
  isTypographicalOnly: boolean
}

export function classifyAmendment(effects: AmendmentEffects): AmendmentClass {
  if (effects.changesFundamentalRight || effects.changesReservedPower) return "fundamental"
  if (effects.breaksInteroperability) return "breaking_protocol"
  if (effects.isTypographicalOnly) return "editorial"
  if (effects.changesOperatorConfigurationOnly) return "operational"
  return "charter"
}
