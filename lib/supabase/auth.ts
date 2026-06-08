/**
 * @deprecated Tourify auth runtime is Supabase-only. NextAuth has been removed.
 * Disabled API routes under app/api/_disabled/ may still reference authOptions — do not use in active code.
 */
export const authOptions = {
  providers: [],
} as const

export async function getSession() {
  return null
}
