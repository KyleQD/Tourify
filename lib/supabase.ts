export {
  supabase,
  checkSession,
  getProfile,
  updateProfile,
  getArtistProfile,
  getVenueProfile,
} from './supabase/client'

export { createServiceRoleClient, serviceRoleClient } from './supabase/service-role'

export { supabase as default } from './supabase/client'
