-- P5 (v1.1 contract): seed venue_place|located_in into the frozen registry.
-- Governed seed for the relation the venue projector depends on.
insert into public.world_relation_types (domain, relation_key, label, description)
values
  ('venue_place', 'located_in', 'Located in',
   'A physical venue sits inside this canonical place.')
on conflict (domain, relation_key) do nothing;
