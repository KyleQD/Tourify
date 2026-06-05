-- RLS Hardening: ensure org-scoped isolation on all admin tables.
-- Tables that already have org_id-based policies are skipped (idempotent).

-- feature_flags: scoped to org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'feature_flags_org_isolation'
  ) THEN
    CREATE POLICY "feature_flags_org_isolation" ON feature_flags
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = feature_flags.org_id)
      );
  END IF;
EXCEPTION WHEN undefined_column THEN
  -- feature_flags may not have org_id yet; skip gracefully
  NULL;
END $$;

-- advancing_documents: scoped via event
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'advancing_documents' AND policyname = 'advancing_documents_org_isolation'
  ) THEN
    CREATE POLICY "advancing_documents_org_isolation" ON advancing_documents
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM events_v2 e
          JOIN profiles p ON p.org_id = e.org_id
          WHERE e.id = advancing_documents.event_id
            AND p.id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- day_sheets: scoped via event
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'day_sheets' AND policyname = 'day_sheets_org_isolation'
  ) THEN
    CREATE POLICY "day_sheets_org_isolation" ON day_sheets
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM events_v2 e
          JOIN profiles p ON p.org_id = e.org_id
          WHERE e.id = day_sheets.event_id
            AND p.id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- settlements: scoped via event
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settlements' AND policyname = 'settlements_org_isolation'
  ) THEN
    CREATE POLICY "settlements_org_isolation" ON settlements
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM events_v2 e
          JOIN profiles p ON p.org_id = e.org_id
          WHERE e.id = settlements.event_id
            AND p.id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ticket_purchases: scoped via event
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_purchases' AND policyname = 'ticket_purchases_org_isolation'
  ) THEN
    CREATE POLICY "ticket_purchases_org_isolation" ON ticket_purchases
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM events_v2 e
          JOIN profiles p ON p.org_id = e.org_id
          WHERE e.id = ticket_purchases.event_id
            AND p.id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- admin_audit_log RLS already created in the audit log migration; skipped here.
