-- pg_cron / pg_net for scheduled social-analytics (optional Edge invocation).
-- Supabase Vault (`create extension vault`) is dashboard-enabled on hosted projects, not always available via migration.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Register nightly job + secrets in Supabase: Project Settings → Vault, then schedule via SQL or UI.
-- Example (run manually when vault + secrets exist):
--   select cron.schedule('social-analytics-nightly', '0 3 * * *', $$ ... net.http_post(...); $$);
