/**
 * Transform individual dietary/allergy records into kitchen-safe aggregates.
 * Never expose person-level medical detail in broad responses.
 */

export interface DietaryPreferenceRecord {
  userId?: string | null
  memberName?: string | null
  preference?: string | null
  allergy?: string | null
  notes?: string | null
}

export interface DietaryKitchenSummary {
  headcount: number
  preferenceCounts: Record<string, number>
  allergyCounts: Record<string, number>
  hasUnspecified: number
  safetyInstructions: string[]
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function buildDietaryKitchenSummary(records: DietaryPreferenceRecord[]): DietaryKitchenSummary {
  const preferenceCounts: Record<string, number> = {}
  const allergyCounts: Record<string, number> = {}
  let hasUnspecified = 0
  const safetyInstructions: string[] = []

  for (const record of records) {
    const preference = record.preference?.trim()
    const allergy = record.allergy?.trim()

    if (!preference && !allergy) {
      hasUnspecified += 1
      continue
    }

    if (preference) {
      const key = normalizeLabel(preference)
      preferenceCounts[key] = (preferenceCounts[key] || 0) + 1
    }

    if (allergy) {
      const key = normalizeLabel(allergy)
      allergyCounts[key] = (allergyCounts[key] || 0) + 1
      const instruction = `Ensure accommodation for ${allergy} (${allergyCounts[key]} guest${allergyCounts[key] === 1 ? '' : 's'})`
      if (!safetyInstructions.includes(instruction))
        safetyInstructions.push(instruction)
    }
  }

  return {
    headcount: records.length,
    preferenceCounts,
    allergyCounts,
    hasUnspecified,
    safetyInstructions,
  }
}

/** Strip person identifiers from a record intended for broad kitchen/vendor views. */
export function redactDietaryPii(record: DietaryPreferenceRecord): {
  preference?: string
  allergy?: string
} {
  return {
    preference: record.preference?.trim() || undefined,
    allergy: record.allergy?.trim() || undefined,
  }
}
