export const EVENT_PROMOTER_FLAG_NAMES = [
  'event_promoter_program_enabled',
  'event_promoter_applications_enabled',
  'event_promoter_attribution_capture_enabled',
  'event_promoter_shadow_commissions_enabled',
  'event_promoter_payable_commissions_enabled',
  'event_promoter_payouts_enabled',
] as const

export type EventPromoterFlagName = (typeof EVENT_PROMOTER_FLAG_NAMES)[number]
export type EventPromoterFlags = Record<EventPromoterFlagName, boolean>

export const DISABLED_EVENT_PROMOTER_FLAGS = Object.fromEntries(
  EVENT_PROMOTER_FLAG_NAMES.map((name) => [name, false]),
) as EventPromoterFlags

export async function resolveEventPromoterFlags(supabase: any): Promise<EventPromoterFlags> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled, rollout_percentage')
    .in('key', EVENT_PROMOTER_FLAG_NAMES)

  if (error || !data) return { ...DISABLED_EVENT_PROMOTER_FLAGS }

  const flags = { ...DISABLED_EVENT_PROMOTER_FLAGS }
  for (const row of data as Array<{ key: EventPromoterFlagName; enabled: boolean; rollout_percentage: number | null }>) {
    if (!EVENT_PROMOTER_FLAG_NAMES.includes(row.key)) continue
    flags[row.key] = row.enabled === true && Number(row.rollout_percentage ?? 0) > 0
  }
  return flags
}
