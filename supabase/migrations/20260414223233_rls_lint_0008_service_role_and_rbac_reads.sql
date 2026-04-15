set client_min_messages = warning;

-- Supabase linter 0008_rls_enabled_no_policy:
-- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
--
-- These tables had RLS on with zero policies (implicit deny for anon/authenticated via PostgREST).
-- Add explicit service_role policies for server-side access.
-- RBAC catalog + self rows: minimal authenticated SELECT so public.has_entity_permission()
-- (plain SQL, invoker rights) can evaluate joins against rbac_* tables.

-- ---------------------------------------------------------------------------
-- RBAC: reads required by has_entity_permission() + service_role full access
-- ---------------------------------------------------------------------------
do $rbac$
begin
  if to_regclass('public.rbac_permissions') is not null then
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_permissions', '_lint0008_rbac_permissions_read');
    execute 'create policy _lint0008_rbac_permissions_read on public.rbac_permissions for select to authenticated using (true)';
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_permissions', '_lint0008_service_role_all');
    execute 'create policy _lint0008_service_role_all on public.rbac_permissions for all to service_role using (true) with check (true)';
  end if;

  if to_regclass('public.rbac_roles') is not null then
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_roles', '_lint0008_rbac_roles_read');
    execute 'create policy _lint0008_rbac_roles_read on public.rbac_roles for select to authenticated using (true)';
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_roles', '_lint0008_service_role_all');
    execute 'create policy _lint0008_service_role_all on public.rbac_roles for all to service_role using (true) with check (true)';
  end if;

  if to_regclass('public.rbac_role_permissions') is not null then
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_role_permissions', '_lint0008_rbac_role_permissions_read');
    execute 'create policy _lint0008_rbac_role_permissions_read on public.rbac_role_permissions for select to authenticated using (true)';
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_role_permissions', '_lint0008_service_role_all');
    execute 'create policy _lint0008_service_role_all on public.rbac_role_permissions for all to service_role using (true) with check (true)';
  end if;

  if to_regclass('public.rbac_user_entity_roles') is not null then
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_user_entity_roles', '_lint0008_rbac_user_entity_roles_own');
    execute $p$
      create policy _lint0008_rbac_user_entity_roles_own on public.rbac_user_entity_roles
      for select to authenticated
      using (user_id = auth.uid())
    $p$;
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_user_entity_roles', '_lint0008_service_role_all');
    execute 'create policy _lint0008_service_role_all on public.rbac_user_entity_roles for all to service_role using (true) with check (true)';
  end if;

  if to_regclass('public.rbac_user_permission_overrides') is not null then
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_user_permission_overrides', '_lint0008_rbac_overrides_own');
    execute $p$
      create policy _lint0008_rbac_overrides_own on public.rbac_user_permission_overrides
      for select to authenticated
      using (user_id = auth.uid())
    $p$;
    perform migration_helpers.drop_policy_if_exists('public', 'rbac_user_permission_overrides', '_lint0008_service_role_all');
    execute 'create policy _lint0008_service_role_all on public.rbac_user_permission_overrides for all to service_role using (true) with check (true)';
  end if;
end $rbac$;

-- ---------------------------------------------------------------------------
-- All other linted tables: service_role only (no change vs zero-policy deny)
-- ---------------------------------------------------------------------------
do $svc$
declare
  t text;
  tbls text[] := array[
    'accommodation_rooms',
    'accommodations',
    'admin_audit_log',
    'analytics',
    'analytics_metrics',
    'artist_contacts',
    'artist_job_applications',
    'artist_job_categories',
    'artist_job_saves',
    'artist_job_views',
    'artists',
    'audit_logs',
    'budget_categories',
    'comments',
    'credential_assignments',
    'credentials',
    'crew',
    'crew_assignments',
    'dashboard_configurations',
    'demo_messages',
    'document_shares',
    'documents',
    'equipment',
    'equipment_assets',
    'equipment_assignments',
    'event_analytics',
    'event_analytics_daily',
    'event_artists',
    'event_budgets',
    'event_marketing_campaigns',
    'event_promo_codes',
    'event_schedules',
    'event_team_documents',
    'event_team_messages',
    'event_ticket_types',
    'expenses',
    'fan_data',
    'fan_interactions',
    'guest_list_entries',
    'guest_lists',
    'health_safety',
    'input_lists',
    'integrations',
    'lighting_plots',
    'marketing_assets',
    'marketing_campaigns',
    'marketplace_moderation_queue',
    'merchandise_inventory',
    'merchandise_sales',
    'merchandise_transactions',
    'message_recipients',
    'onboarding_activities',
    'onboarding_candidates',
    'organization_users',
    'power_requirements',
    'press_contacts',
    'press_releases',
    'production_equipment',
    'rbac_permission_audit_log',
    'reports',
    'revenue',
    'roles',
    'schedule_item_assignments',
    'setlist_songs',
    'setlists',
    'social_media_posts',
    'staff_invitations',
    'staff_onboarding_activities',
    'staff_profiles',
    'stage_plots',
    'system_settings',
    'technical_notes',
    'technical_requirements',
    'templates',
    'ticket_email_templates',
    'ticketing_integrations',
    'ticketing_webhooks',
    'transportation',
    'users',
    'vendor_contacts',
    'vendors',
    'venue_contacts',
    'venues',
    'verification_criteria',
    'weather_data'
  ];
begin
  foreach t in array tbls
  loop
    continue when to_regclass(format('public.%I', t)) is null;
    perform migration_helpers.drop_policy_if_exists('public', t, '_lint0008_service_role_all');
    execute format(
      'create policy _lint0008_service_role_all on public.%I for all to service_role using (true) with check (true)',
      t
    );
  end loop;
end $svc$;
