# Active Supabase migration chain

Only numbered SQL files directly in this directory are active migrations. Their
lexicographic filename order is the authoritative schema apply order for local
and hosted Supabase environments.

`archive/`, `../migration-archive/`, `../migrations_backup/`, and root-level
`supabase/*.sql` files are retained only as historical evidence. They are never
an apply source and must not be copied into an active environment.

Use `supabase db reset` for a fresh local replay and `supabase db push` for a
history-aware target apply. Do not manually paste or replay selected SQL files.
