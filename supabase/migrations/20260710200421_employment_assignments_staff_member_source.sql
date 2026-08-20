ALTER TABLE public.employment_assignments
  ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

ALTER TABLE public.employment_assignments
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_employment_assignments_staff_member
  ON public.employment_assignments (staff_member_id)
  WHERE staff_member_id IS NOT NULL;;
