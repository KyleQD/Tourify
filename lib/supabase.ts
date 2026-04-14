// Browser-safe exports only. Do not re-export service-role here: webpack would
// bundle `service-role.ts` into any client chunk that imports `@/lib/supabase`,
// and its top-level env check throws without SUPABASE_SERVICE_ROLE_KEY.
export {
  supabase,
  checkSession,
  getProfile,
  updateProfile,
  getArtistProfile,
  getVenueProfile,
} from './supabase/client'

export { supabase as default } from './supabase/client'
