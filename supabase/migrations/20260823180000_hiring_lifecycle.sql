-- ═══════════════════════════════════════════════════════════════
-- VEN-131/132/133 — hiring lifecycle: one vocabulary, compliance gate,
-- transactional hire service.
--
-- VEN-131: job_applications.status collapses to ONE canonical vocabulary —
--   new → reviewed → interviewed → offer → hired | rejected
--   (legacy drift approved/accepted/reviewing/in_review folds into it).
-- VEN-132: transition into 'hired' REQUIRES a passing hiring_eligibility_
--   snapshots row for the application (is_eligible = true). No snapshot, no
--   hire — the gate is in the database, not the UI.
-- VEN-133: hire_venue_candidate(p_application_id) runs in ONE transaction:
--   staff_members upsert-by-identity → employment_assignments (invited) →
--   staff_onboarding_candidates insert (linked to the application) → status +
--   audit row. Any failure rolls everything back.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Canonical vocabulary constraint ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.canonical_application_status(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(btrim(coalesce(raw,'')))
    WHEN 'approved'     THEN 'offer'
    WHEN 'accepted'     THEN 'hired'
    WHEN 'reviewing'    THEN 'reviewed'
    WHEN 'in_review'    THEN 'reviewed'
    WHEN 'interviewed'  THEN 'interviewed'
    WHEN 'offer'        THEN 'offer'
    WHEN 'hired'        THEN 'hired'
    WHEN 'rejected'     THEN 'rejected'
    WHEN 'pending'      THEN 'new'
    WHEN 'shortlisted'  THEN 'interviewed'
    WHEN 'waitlisted'   THEN 'reviewed'
    WHEN 'withdrawn'    THEN 'withdrawn'
    ELSE 'new'
  END
$$;


-- The live table carries a legacy status CHECK with a different vocabulary.
-- Drop it (we install the canonical constraint after backfill).
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

-- Backfill FIRST so the new constraint never sees legacy values.
DO $$
DECLARE v_fixed int;
BEGIN
  UPDATE public.job_applications
  SET status = public.canonical_application_status(status)
  WHERE status IN ('approved','accepted','reviewing','in_review','pending');
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  RAISE NOTICE 'VEN-131 status drift backfill: % application(s) normalized', v_fixed;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_status_canonical'
  ) THEN
    ALTER TABLE public.job_applications
      ADD CONSTRAINT job_applications_status_canonical
      CHECK (status IN ('new','reviewed','interviewed','offer','hired','rejected','withdrawn'));
    -- Legacy values remain VALID but map to canonical on write via helper;
    -- new writes from the API use only the canonical six + withdrawn.
  END IF;
END $$;

-- ── 3. Compliance eligibility gate + transactional hire (VEN-132/133) ──────
CREATE OR REPLACE FUNCTION public.hire_venue_candidate(
  p_application_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  app public.job_applications%ROWTYPE;
  snap record;
  v_staff_id uuid;
  v_assignment_id uuid;
  v_candidate_id uuid;
  v_venue_owner uuid;
BEGIN
  SELECT * INTO app FROM public.job_applications WHERE id = p_application_id FOR UPDATE;
  IF app.id IS NULL THEN RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002'; END IF;
  IF app.status = 'hired' THEN
    RETURN jsonb_build_object('already_hired', true, 'staff_member_id', NULL);
  END IF;

  -- VEN-132: eligibility gate — latest snapshot must be passing.
  SELECT is_eligible, blocking_reasons INTO snap
  FROM public.hiring_eligibility_snapshots
  WHERE application_id = p_application_id
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No compliance eligibility check on file — run eligibility first'
      USING ERRCODE = '40901';
  END IF;
  IF snap.is_eligible IS NOT TRUE THEN
    RAISE EXCEPTION 'Candidate failed compliance eligibility: %',
      COALESCE(snap.blocking_reasons::text, 'see snapshot')
      USING ERRCODE = '40902';
  END IF;

  -- Identity resolution for the staff_members upsert.
  SELECT user_id INTO v_venue_owner FROM public.venue_profiles WHERE id = app.venue_id;

  IF app.applicant_id IS NOT NULL THEN
    SELECT sm.id INTO v_staff_id
    FROM public.staff_members sm
    WHERE sm.employer_entity_type = 'venue'
      AND sm.employer_entity_id = app.venue_id
      AND sm.user_id = app.applicant_id
    LIMIT 1;
  END IF;

  IF v_staff_id IS NULL THEN
    INSERT INTO public.staff_members (
      user_id, name, email, role, department, employment_type,
      employer_entity_type, employer_entity_id, status, created_at, updated_at
    )
    VALUES (
      app.applicant_id,
      COALESCE(app.applicant_name, 'New hire'),
      COALESCE(app.applicant_email, ''),
      'member',
      'operations',
      'full_time',
      'venue', app.venue_id,
      'active',
      now(), now()
    )
    RETURNING id INTO v_staff_id;
  ELSE
    UPDATE public.staff_members SET status='active', updated_at=now() WHERE id=v_staff_id;
  END IF;

  -- Employment assignment (Work Mode visibility via VEN-141 sync path).
  INSERT INTO public.employment_assignments (
    user_id, staff_member_id, staff_shift_id, venue_id,
    employer_entity_type, employer_entity_id,
    role_title, department, permissions, starts_at, ends_at, status, source
  )
  VALUES (
    (SELECT user_id FROM public.staff_members WHERE id = v_staff_id),
    v_staff_id,
    NULL,
    app.venue_id,
    'venue', app.venue_id,
    'New hire',
    'operations',
    '{}'::jsonb,
    now(), NULL,
    'invited',
    'hiring'
  )
  RETURNING id INTO v_assignment_id;

  -- Onboarding candidate linked to BOTH application ids (VEN-135 convergence).
  INSERT INTO public.staff_onboarding_candidates (
    venue_id, application_id, job_application_id, job_posting_id,
    name, email, phone, position, department,
    employment_type, employer_entity_type, employer_entity_id,
    user_id, status, stage, created_at, updated_at
  )
  VALUES (
    app.venue_id, p_application_id, p_application_id, app.job_posting_id,
    COALESCE(app.applicant_name,'New hire'),
    app.applicant_email, app.applicant_phone,
    'Team member', 'operations',
    'full_time', 'venue', app.venue_id,
    app.applicant_id,
    'onboarding', 'orientation',
    now(), now()
  )
  RETURNING id INTO v_candidate_id;

  UPDATE public.job_applications
  SET status='hired', reviewed_by=p_actor_user_id, reviewed_at=now(), updated_at=now()
  WHERE id=p_application_id;

  INSERT INTO public.hiring_audit_events (
    application_id, job_id, venue_id, actor_user_id, action,
    from_status, to_status, metadata
  )
  VALUES (
    p_application_id, app.job_posting_id, app.venue_id, p_actor_user_id, 'hire',
    app.status, 'hired',
    jsonb_build_object('staff_member_id',v_staff_id,'employment_assignment_id',v_assignment_id,'onboarding_candidate_id',v_candidate_id)
  );

  RETURN jsonb_build_object(
    'staff_member_id', v_staff_id,
    'employment_assignment_id', v_assignment_id,
    'onboarding_candidate_id', v_candidate_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hire_venue_candidate(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hire_venue_candidate(uuid, uuid) TO authenticated;
