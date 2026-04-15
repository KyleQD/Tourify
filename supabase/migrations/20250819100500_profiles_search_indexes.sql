set client_min_messages = warning;

-- Create GIN indexes for array fields used in search/filtering
-- Non-destructive and safe to re-run

-- For text[] arrays, GIN with default operator class
create index if not exists idx_profiles_skills_gin on profiles using gin (skills);
create index if not exists idx_profiles_preferred_project_types_gin on profiles using gin (preferred_project_types);


