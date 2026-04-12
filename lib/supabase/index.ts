export {
  supabase,
  createServerClient as createClient,
  checkSession,
  getProfile,
  updateProfile,
  getArtistProfile,
  getVenueProfile,
} from './client'

export { supabase as default } from './client'
