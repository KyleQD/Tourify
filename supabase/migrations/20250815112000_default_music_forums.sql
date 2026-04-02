-- Create 10 default music forums for Reddit-like discussions
-- This migration depends on forums table existing from 20250815111000_forums_core.sql

do $$
declare
  uid uuid;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'forums'
  ) then
    return;
  end if;

  select id into uid from auth.users order by created_at asc nulls last limit 1;
  if uid is null then
    return;
  end if;

  insert into forums (slug, name, description, created_by) values
    ('indie-music', 'Indie Music', 'Discover and discuss independent artists, hidden gems, and the latest indie releases', uid),
    ('hip-hop', 'Hip-Hop', 'Everything hip-hop: new drops, classic albums, producers, and culture', uid),
    ('songwriting', 'Songwriting', 'Share lyrics, discuss songwriting techniques, and collaborate on music creation', uid),
    ('live-music', 'Live Music', 'Concert reviews, festival experiences, and live performance discussions', uid),
    ('music-production', 'Music Production', 'Beat making, mixing, mastering, and home studio setups', uid),
    ('electronic', 'Electronic', 'House, techno, ambient, EDM, and all electronic music genres', uid),
    ('music-discovery', 'Music Discovery', 'Share your finds and discover new artists across all genres', uid),
    ('gear-and-instruments', 'Gear & Instruments', 'Guitars, synths, interfaces, and all music equipment discussion', uid),
    ('music-business', 'Music Business', 'Industry insights, marketing tips, and artist career advice', uid),
    ('music-theory', 'Music Theory', 'Scales, chord progressions, composition, and musical analysis', uid)
  on conflict (slug) do nothing;
end $$;
