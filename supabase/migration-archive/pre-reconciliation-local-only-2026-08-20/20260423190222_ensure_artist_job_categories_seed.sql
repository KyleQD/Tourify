set client_min_messages = warning;

-- Idempotent seed for environments where artist_job_categories was created
-- without rows (e.g. partial migration replay). FK from artist_jobs.category_id
-- fails job POST when categories are missing.

insert into public.artist_job_categories (name, description, icon, color) values
  ('Opening Slots', 'Opening act opportunities for concerts and tours', 'Music', '#8B5CF6'),
  ('Venue Bookings', 'Direct booking opportunities at venues', 'MapPin', '#10B981'),
  ('Collaborations', 'Music collaborations with other artists', 'Users', '#F59E0B'),
  ('Session Work', 'Studio session musician opportunities', 'Mic', '#EF4444'),
  ('Production', 'Music production and mixing opportunities', 'Settings', '#6366F1'),
  ('Touring', 'Tour musician and crew opportunities', 'Truck', '#EC4899'),
  ('Festivals', 'Festival performance opportunities', 'Calendar', '#14B8A6'),
  ('Teaching', 'Music education and lesson opportunities', 'Book', '#F97316'),
  ('Events', 'Private events and corporate gigs', 'Star', '#84CC16'),
  ('Online', 'Virtual performances and streaming opportunities', 'Monitor', '#06B6D4')
on conflict (name) do nothing;
