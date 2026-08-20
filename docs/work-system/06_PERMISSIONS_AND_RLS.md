# Permissions and RLS

Workers can only read an assignment where `employment_assignments.user_id = auth.uid()`. A worker may read a linked shift and published packet only through that assignment. Check-in and acknowledgements require the authenticated user, confirmed/active assignment, matching event, and the appropriate assignment capability.

Server routes revalidate ownership on every ID-bearing request. UI visibility is advisory only; RLS and route contracts are the authority.
