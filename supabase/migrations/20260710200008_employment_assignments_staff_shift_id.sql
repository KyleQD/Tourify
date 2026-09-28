ALTER TABLE public.employment_assignments
  ADD COLUMN IF NOT EXISTS staff_shift_id UUID REFERENCES public.staff_shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employment_assignments_staff_shift
  ON public.employment_assignments (staff_shift_id)
  WHERE staff_shift_id IS NOT NULL;

COMMENT ON COLUMN public.employment_assignments.staff_shift_id IS
  'Optional link to the staff_shifts row that invited this Work Mode assignment.';;
