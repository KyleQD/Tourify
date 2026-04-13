export {
  supabase,
  checkSession,
  getProfile,
  updateProfile,
  getArtistProfile,
  getVenueProfile,
} from './client'

export { createServiceRoleClient, serviceRoleClient } from './service-role'

export { supabase as default } from './client'
