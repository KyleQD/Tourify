-- DB-002 release hardening: privileged helpers must not be public RPCs.
--
-- These functions are SECURITY DEFINER and live in the exposed public schema.
-- PostgreSQL grants EXECUTE to PUBLIC by default, so explicitly remove that
-- inherited access and retain only the roles used by server-side callers.

begin;

revoke execute on function public.can_view_hiring_pii(uuid, text, uuid) from public, anon;
revoke execute on function public.replace_ticket_revenue_allocations(uuid, jsonb) from public, anon;
revoke execute on function public.delete_tour_cascade(uuid) from public, anon;
revoke execute on function public.has_entity_permission(uuid, text, uuid, text) from public, anon;

grant execute on function public.can_view_hiring_pii(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.replace_ticket_revenue_allocations(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_tour_cascade(uuid) to authenticated, service_role;
grant execute on function public.has_entity_permission(uuid, text, uuid, text) to authenticated, service_role;

commit;
