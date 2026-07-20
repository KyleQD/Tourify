# Demo SQL hotfixes (Wave 2 / Wave 3 blockers)

These migrations exist in-repo but were **not** applied via CLI during remediation because:

- `supabase db push` failed SASL auth (DB password not available to the linked CLI session)
- Vercel `POSTGRES_PASSWORD` / `POSTGRES_URL*` for production are empty
- Supabase MCP `apply_migration` was unavailable in-session

Apply in **Supabase Dashboard → Tourify Demo (`auqddrodjezjlypkzfpi`) → SQL Editor**.

## 1. Drop broken `artist_profiles` `owner_user_id` triggers

Source: `supabase/migrations/20260718200000_fix_artist_profiles_owner_user_id_trigger.sql`

Required for `POST /api/accounts` `create_artist` / `qa:seed` create-path.

## 2. DM trust-model columns

Source: `supabase/migrations/20260520222000_dm_trust_model.sql`

Demo currently lacks `conversations.trust_tier` (and related columns). The messages API now **degrades** to base columns so DMs still send, but trust tabs/rate limits need this migration for full behavior.

## Verify

```sql
-- artist_profiles: no trigger function body should reference owner_user_id
select t.tgname
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and c.relname = 'artist_profiles'
  and not t.tgisinternal
  and pg_get_functiondef(p.oid) ilike '%owner_user_id%';

-- conversations trust columns
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'conversations'
  and column_name in ('trust_tier', 'accepted_at', 'context_type', 'context_id');
```

Then re-run:

```bash
npm run qa:seed
npm run qa:audit:interactions
```

## Post-apply status (2026-07-18)

| Check | Result |
|-------|--------|
| `qa:seed` create-path (artist personas) | **Pass** — A/B created with artist/venue/org personas |
| `qa:audit:interactions` | **18 pass / 0 fail** — includes `A → B POST /api/messages` |
| REST `conversations.trust_tier` | Still missing on Demo as of re-probe; DM path degrades to base columns and still passes |

If trust tabs / request rate limits are needed on Demo, re-run migration `20260520222000_dm_trust_model.sql` against project `auqddrodjezjlypkzfpi` and confirm the column probe above returns four rows.
