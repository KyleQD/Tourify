/**
 * Optional cross-device sync for product education state.
 * Today dismissals live in `localStorage` only (see `storage.ts`).
 * When a PATCH endpoint merges `profile_data.profile_experience.product_education`,
 * hydrate from the profile response here and call `writeEducationState`.
 */
export async function mergeEducationFromProfile(): Promise<void> {
  return Promise.resolve()
}
