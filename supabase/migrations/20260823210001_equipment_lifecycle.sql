-- ═══════════════════════════════════════════════════════════════
-- VEN-207 / VEN-208 / VEN-209 — equipment lifecycle fields & maintenance log.
--
-- 1. Identity/value fields on venue_equipment (VEN-207): manufacturer, model,
--    serial_number, purchase_price, replacement_value, insurance_policy.
-- 2. Work-order history (VEN-208): equipment_maintenance_log replaces the
--    last/next-date-only model. Completing a 'scheduled' entry stamps the
--    parent's last_maintenance (VEN-209) via trigger.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.venue_equipment
  ADD COLUMN IF NOT EXISTS manufacturer       text,
  ADD COLUMN IF NOT EXISTS model              text,
  ADD COLUMN IF NOT EXISTS serial_number      text,
  ADD COLUMN IF NOT EXISTS purchase_price     numeric(12,2) CHECK (purchase_price >= 0),
  ADD COLUMN IF NOT EXISTS replacement_value  numeric(12,2) CHECK (replacement_value >= 0),
  ADD COLUMN IF NOT EXISTS insurance_policy   text;

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id   uuid NOT NULL REFERENCES public.venue_equipment(id) ON DELETE CASCADE,
  title          text NOT NULL,
  type           text NOT NULL DEFAULT 'service'
                 CHECK (type IN ('inspection','repair','service','calibration')),
  status         text NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  scheduled_date date,
  completed_date date,
  performed_by   text,
  cost           numeric(12,2) CHECK (cost >= 0),
  notes          text,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equip_maint_equipment
  ON public.equipment_maintenance_log (equipment_id, scheduled_date DESC);

ALTER TABLE public.equipment_maintenance_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equip_maint_owner ON public.equipment_maintenance_log;
CREATE POLICY equip_maint_owner ON public.equipment_maintenance_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.venue_equipment ve
      JOIN public.venue_profiles vp ON vp.id = ve.venue_id
      WHERE ve.id = equipment_maintenance_log.equipment_id
        AND (vp.user_id = auth.uid() OR vp.main_profile_id = auth.uid())
    )
  );

-- Completing a log entry rolls the date onto the asset's last_maintenance.
CREATE OR REPLACE FUNCTION public.sync_maintenance_completion()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.completed_date IS NOT NULL THEN
    UPDATE public.venue_equipment
    SET last_maintenance = NEW.completed_date, updated_at = now()
    WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equip_maint_completion ON public.equipment_maintenance_log;
CREATE TRIGGER trg_equip_maint_completion
  AFTER UPDATE OF status, completed_date ON public.equipment_maintenance_log
  FOR EACH ROW WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.sync_maintenance_completion();

DO $$
DECLARE v_present int;
BEGIN
  SELECT count(*) INTO v_present FROM information_schema.columns
  WHERE table_schema='public' AND table_name='venue_equipment'
    AND column_name IN ('manufacturer','model','serial_number','purchase_price','replacement_value','insurance_policy');
  RAISE NOTICE 'VEN-207/208/209 equipment lifecycle provisioned: % of 6 new column(s), maintenance log ready', v_present;
END $$;
