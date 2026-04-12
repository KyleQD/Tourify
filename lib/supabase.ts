export {
  supabase,
  createServerClient as createClient,
  checkSession,
  getProfile,
  updateProfile,
  getArtistProfile,
  getVenueProfile,
} from './supabase/client'

export { supabase as default } from './supabase/client'
