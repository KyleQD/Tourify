export interface Cue { workTitle: string; durationSeconds: number; useType: string; iswc?: string; isrc?: string; writers: string[] }
export interface CueSheetValidation { valid: boolean; errors: string[]; warnings: string[] }
export function validateCueSheet(cues: Cue[]): CueSheetValidation {
  const errors: string[] = []; const warnings: string[] = []
  cues.forEach((cue, index) => {
    if (!cue.workTitle.trim()) errors.push(`cue_${index}_missing_title`)
    if (cue.durationSeconds <= 0) errors.push(`cue_${index}_invalid_duration`)
    if (!cue.useType.trim()) errors.push(`cue_${index}_missing_use_type`)
    if (!cue.writers.length) warnings.push(`cue_${index}_missing_writers`)
    if (!cue.iswc && !cue.isrc) warnings.push(`cue_${index}_missing_standard_identifier`)
  })
  return { valid: errors.length === 0, errors, warnings }
}
