# ADM-B01 fresh migration rehearsal — ticketing reconciliation syntax failure

The correct Tourify workspace reached `20260821000000_reconcile_ticketing_foundation.sql` on Supabase CLI 2.22.6. The ticketing tables and indexes were created successfully, then PostgreSQL stopped at the `financial_transactions_category_check` block with `SQLSTATE 42601` (`unexpected end of function definition at end of input`).

The failing form was missing the outer `CHECK` close: `check (category in (...)) NOT VALID` was emitted as `check (category in (...) NOT VALID;`. The migration now uses `check (category in (...)) NOT VALID;`. No persistent or production database was changed; the disposable stack was cleaned up by the CLI after the failed apply.
