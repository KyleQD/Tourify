-- FLOW-002: Authenticated users could not INSERT tours even when created_by/user_id = auth.uid().
-- Recreate a clear permissive insert policy for tour owners.

drop policy if exists tours_insert_owner_or_org on public.tours;
drop policy if exists tours_insert_owner on public.tours;

create policy tours_insert_owner_or_org
on public.tours
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or user_id = auth.uid()
    or (org_id is not null and public.is_org_member(auth.uid(), org_id))
  )
);

comment on policy tours_insert_owner_or_org on public.tours is
  'Allow tour create when the row is owned by the caller or scoped to an org they belong to.';
