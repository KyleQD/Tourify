interface CrossBorderInput { purposeApproved:boolean; authorityCurrent:boolean; minimized:boolean; transferMechanismApproved:boolean; localizationReviewed:boolean; onwardControls:boolean; retentionPolicy:boolean; sanctionsClear:boolean; }
export function evaluateCrossBorderExchange(input: CrossBorderInput) {
  const failed=Object.entries(input).filter(([,v])=>!v).map(([k])=>k);
  return { allowed:failed.length===0, failed };
}
