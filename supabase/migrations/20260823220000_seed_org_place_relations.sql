-- P6 (contracts v1 registry): seed organization geography relations.
insert into public.world_relation_types (domain, relation_key, label, description)
values
  ('org_place', 'headquartered_in', 'Headquartered in',
   'The organization''s stable base location from explicit org settings.'),
  ('org_place', 'associated_with', 'Associated with',
   'General organizational association with a canonical place.')
on conflict (domain, relation_key) do nothing;
