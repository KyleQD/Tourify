# Database objects

<!-- generated: do not edit -->

- Source SHA: `cd57bbfb7c664fa31cbd3289373983fbe1ee4add`
- Branch: `release/clean-snapshot`
- Working tree: clean
- Generated at: 2026-09-20T11:37:41.909Z
- Generator: `control-plane.mjs generate`

## Objects (705)

| Type | Name | Latest create evidence |
| --- | --- | --- |
| function | `_tourify_has_columns` | `supabase/migrations/20260625000000_polymorphic_hiring_entity.sql` |
| function | `accept_org_invite` | `supabase/migrations/20260910000001_get_active_organizer_account_for_org.sql` |
| function | `accept_tour_collaboration_invitation` | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| function | `accept_venue_ownership_transfer` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `admin_commit_domain_with_outbox` | `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql` |
| function | `admin_publication_outbox_claim` | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| function | `admin_publication_outbox_claim_for_org` | `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql` |
| function | `admin_publication_outbox_mark_delivered` | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| function | `admin_publication_outbox_mark_delivered_for_org` | `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql` |
| function | `admin_publication_outbox_mark_failed` | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| function | `admin_publication_outbox_mark_failed_for_org` | `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql` |
| function | `admin_publication_outbox_replay` | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| function | `admin_publication_outbox_replay_for_org` | `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql` |
| function | `admin_publication_transactional_publish` | `supabase/migrations/20260720200000_admin_publication_transactional_publish_pub204.sql` |
| function | `admin_resolve_acting_context` | `supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql` |
| function | `admin_revoke_acting_context` | `supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql` |
| function | `admin_switch_acting_context` | `supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql` |
| function | `archive_venue_profile` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `audit_event_update` | `supabase/migrations/20250816133000_event_core.sql` |
| function | `begin_mfa_verification_attempt` | `supabase/migrations/20260918213707_mfa_verification_code_store.sql` |
| function | `bump_account_follower_count` | `supabase/migrations/20260712003357_account_follows.sql` |
| function | `can_access_flight` | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| function | `can_access_ground_transport` | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| function | `can_access_lodging_booking` | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| function | `can_access_org_scope` | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| function | `can_access_tour` | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| function | `can_access_travel_group` | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| function | `can_edit_site_map` | `supabase/migrations/20250131000000_site_map_system.sql` |
| function | `can_logistics` | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| function | `can_manage_event_hq` | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| function | `can_manage_hiring` | `supabase/migrations/20260625000000_polymorphic_hiring_entity.sql` |
| function | `can_publication` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| function | `can_view_hiring_pii` | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| function | `cancel_venue_ownership_transfer` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `canonical_application_status` | `supabase/migrations/20260823180000_hiring_lifecycle.sql` |
| function | `cleanup_expired_mfa_verification_codes` | `supabase/migrations/20260918213707_mfa_verification_code_store.sql` |
| function | `cleanup_old_notifications` | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| function | `cleanup_orphaned_artist_files` | `supabase/migrations/20250115000001_artist_storage_setup.sql` |
| function | `close_slot_on_request_approval` | `supabase/migrations/20250814124500_venue_recurring.sql` |
| function | `column_exists` | `supabase/migrations/archive/fix_posts_schema.sql` |
| function | `complete_onboarding_step` | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| function | `compute_hot_score` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| function | `compute_reservation_range` | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| function | `consolidate_v2_table_keep_base` | `supabase/migrations/archive/phase3-dynamic-migration.sql` |
| function | `consolidate_v2_table_keep_v2` | `supabase/migrations/archive/phase3-dynamic-migration.sql` |
| function | `consolidate_v2_table_rename_only` | `supabase/migrations/archive/phase3-dynamic-migration.sql` |
| function | `create_artist_account` | `supabase/migrations/archive/setup_signup_flow.sql` |
| function | `create_comment_notification` | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| function | `create_default_notification_preferences` | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| function | `create_follow_acceptance_notification` | `supabase/migrations/archive/fix-notifications-safe.sql` |
| function | `create_follow_request_notification` | `supabase/migrations/archive/fix-notifications-safe.sql` |
| function | `create_like_notification` | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| function | `create_map_version` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| function | `create_organizer_account` | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| function | `create_post_reshare` | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| function | `create_post_with_context` | `supabase/migrations/archive/complete_migration.sql` |
| function | `create_share_notification` | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| function | `create_tour_quick_start_events` | `supabase/migrations/20260731194002_quick_start_event_rpc_rls_repair.sql` |
| function | `create_venue_account` | `supabase/migrations/archive/setup_signup_flow.sql` |
| function | `create_venue_reservation` | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| function | `create_workflow_for_candidate` | `supabase/migrations/archive/workflow_migration_clean.sql` |
| function | `delete_tour_cascade` | `supabase/migrations/20260823220001_money_path_transactional_rpcs.sql` |
| function | `delete_venue_profile` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `enforce_job_application_approval_gate` | `supabase/migrations/20260701024346_relax_hiring_approval_gate.sql` |
| function | `ensure_workforce_coordinator_channel` | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| function | `expire_stale_venue_transfers` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `expire_ticket_reservations` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| function | `extract_hashtags_from_content` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `finalize_ticket_inventory` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| function | `finish_mfa_verification_attempt` | `supabase/migrations/20260918213707_mfa_verification_code_store.sql` |
| function | `fix_missing_profiles` | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| function | `forum_apply_vote_to_comment` | `supabase/migrations/20250815111000_forums_core.sql` |
| function | `forum_apply_vote_to_thread` | `supabase/migrations/20250815111000_forums_core.sql` |
| function | `forum_increment_comments_count` | `supabase/migrations/20250815111000_forums_core.sql` |
| function | `forum_threads_tsv_trigger` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| function | `forum_touch_updated_at` | `supabase/migrations/20250815111000_forums_core.sql` |
| function | `generate_equipment_qr_code` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| function | `generate_lodging_booking_number` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| function | `generate_lodging_payment_number` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| function | `generate_rental_agreement_number` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| function | `generate_slots_for_template` | `supabase/migrations/20260823030000_rpc_authorization_hardening.sql` |
| function | `generate_unique_username` | `supabase/migrations/20260404110000_fix_signup_trigger_resilience.sql` |
| function | `get_account_display_info` | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| function | `get_account_display_info_by_context` | `supabase/migrations/archive/COMPREHENSIVE_SCALABLE_SOLUTION.sql` |
| function | `get_account_info_flexible` | `supabase/migrations/archive/COMPREHENSIVE_ROUTE_BASED_SOLUTION.sql` |
| function | `get_account_type_from_route` | `supabase/migrations/archive/COMPREHENSIVE_ROUTE_BASED_SOLUTION.sql` |
| function | `get_active_organizer_account_for_org` | `supabase/migrations/20260910000001_get_active_organizer_account_for_org.sql` |
| function | `get_admin_ticketing_overview` | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| function | `get_admin_ticketing_social_performance` | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| function | `get_album_photos` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| function | `get_artist_storage_stats` | `supabase/migrations/20250115000001_artist_storage_setup.sql` |
| function | `get_collaboration_stats` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| function | `get_enhanced_artist_stats` | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| function | `get_events_user_column` | `supabase/migrations/archive/01_helper_functions.sql` |
| function | `get_or_create_account` | `supabase/migrations/archive/COMPREHENSIVE_SCALABLE_SOLUTION.sql` |
| function | `get_or_create_conversation` | `supabase/migrations/archive/quick_messaging_fix.sql` |
| function | `get_profile_with_stats` | `supabase/migrations/20250211000000_production_schema_optimization.sql` |
| function | `get_project_stats` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| function | `get_purchased_photos` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| function | `get_site_map_with_data` | `supabase/migrations/20250131000000_site_map_system.sql` |
| function | `get_staff_dashboard_stats` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| function | `get_tent_availability` | `supabase/migrations/20250131000000_site_map_system.sql` |
| function | `get_user_accounts` | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| function | `get_user_accounts_adaptive` | `supabase/migrations/20260825121000_phase1_rpc_actor_binding.sql` |
| function | `get_venue_dashboard_stats` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| function | `get_venue_image_url` | `supabase/migrations/20260413100000_fix_storage_helpers.sql` |
| function | `guard_admin_publication_child_update` | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| function | `guard_admin_publication_snapshot_update` | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| function | `guard_conversation_participants` | `supabase/migrations/20260823160000_messaging_isolation.sql` |
| function | `guard_post_appearance_snapshot_immutability` | `supabase/migrations/20260728224543_harden_post_appearance_v2.sql` |
| function | `guard_profile_privilege_columns` | `supabase/migrations/20260825122000_phase2_profiles_elevation_guard.sql` |
| function | `handle_account_relationships_changes` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `handle_auth_user_email_confirmed` | `supabase/migrations/20260415210006_signup_profile_and_email_confirmation.sql` |
| function | `handle_follow_request_accepted` | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| function | `handle_follow_request_rejected` | `supabase/migrations/20250131000004_friend_suggestions_system.sql` |
| function | `handle_follows_changes` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `handle_new_user` | `supabase/migrations/archive/simple_auth_fix.sql` |
| function | `handle_post_changes` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `handle_post_comments_changes` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `handle_post_likes_changes` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `has_admin_logistics_scope` | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| function | `has_entity_permission` | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| function | `has_event_ticketing_grant` | `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql` |
| function | `has_global_permission` | `supabase/migrations/20260822151252_world_editorial_rbac.sql` |
| function | `has_perm` | `supabase/migrations/20260821180438_job_posting_scopes_and_organization_seats.sql` |
| function | `has_project_permission` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| function | `hire_from_job_board` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| function | `hire_venue_candidate` | `supabase/migrations/20260823180000_hiring_lifecycle.sql` |
| function | `increment_job_posting_views` | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| function | `increment_ticket_quantity_sold` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| function | `is_confirmed_tour_team_member` | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| function | `is_event_team_member` | `supabase/migrations/20260415121000_repair_logistics_team_member_helpers.sql` |
| function | `is_event_v2_org_member` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| function | `is_org_member` | `supabase/migrations/20260821180438_job_posting_scopes_and_organization_seats.sql` |
| function | `is_tour_owner` | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| function | `is_tour_team_member` | `supabase/migrations/20260415121000_repair_logistics_team_member_helpers.sql` |
| function | `is_travel_group_member` | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| function | `is_valid_image_type` | `supabase/migrations/20250115000001_artist_storage_setup.sql` |
| function | `is_valid_music_type` | `supabase/migrations/20250115000001_artist_storage_setup.sql` |
| function | `issue_mfa_verification_code` | `supabase/migrations/20260918213707_mfa_verification_code_store.sql` |
| function | `legacy_assignment_belongs_to_caller` | `supabase/migrations/20260823072000_shift_rls_hardening.sql` |
| function | `legacy_venue_workforce_manager` | `supabase/migrations/20260823072000_shift_rls_hardening.sql` |
| function | `log_site_map_activity` | `supabase/migrations/20250131000000_site_map_system.sql` |
| function | `lookup_profile_id_by_username` | `supabase/migrations/20260328120000_artist_contracts_signing.sql` |
| function | `marketplace_touch_updated_at` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| function | `migration_helpers` | `supabase/migrations/20240410000001_migration_helpers.sql` |
| function | `normalize_venue_amenity_key` | `supabase/migrations/20260823090000_canonical_location_and_amenities.sql` |
| function | `notify_contract_counterparty` | `supabase/migrations/20260328120000_artist_contracts_signing.sql` |
| function | `notify_group_message_recipients` | `supabase/migrations/20260520224000_group_threads_model.sql` |
| function | `notify_task_assignment` | `supabase/migrations/20250818122010_logistics_tasks_align.sql` |
| function | `notify_task_status_change` | `supabase/migrations/20250818122500_logistics_task_status_notify.sql` |
| function | `notify_team_communication_recipients` | `supabase/migrations/20260416000323_team_comms_fanout_and_rls_cleanup.sql` |
| function | `notify_workflow_stage_change` | `supabase/migrations/archive/workflow_migration_clean.sql` |
| function | `preflight_venue_archive` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `private` | `supabase/migrations/20260909195618_atomic_org_invites.sql` |
| function | `process_v2_table_consolidation` | `supabase/migrations/archive/phase3-dynamic-migration.sql` |
| function | `publish_admin_tour` | `supabase/migrations/20260720020302_admin_tour_stop_publish.sql` |
| function | `reconcile_admin_tour_events` | `supabase/migrations/20260720020302_admin_tour_stop_publish.sql` |
| function | `record_initial_post_appearance_revision` | `supabase/migrations/20260728224543_harden_post_appearance_v2.sql` |
| function | `record_venue_slug_rename` | `supabase/migrations/20260823100000_slug_rename_history.sql` |
| function | `refresh_account_display_info` | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| function | `refresh_forum_mviews` | `supabase/migrations/20250816130000_scaling_indexes_forum.sql` |
| function | `refresh_staffing_overview_cache` | `supabase/migrations/20260409134500_staffing_overview_cache.sql` |
| function | `refresh_venue_analytics_daily` | `supabase/migrations/20260825030000_analytics_truth.sql` |
| function | `release_ticket_inventory` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| function | `release_venue_reservation` | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| function | `replace_ticket_revenue_allocations` | `supabase/migrations/20260910150000_version_ticket_revenue_allocations.sql` |
| function | `request_venue_ownership_transfer` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `reserve_admin_logistics_equipment` | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| function | `reserve_ticket_inventory` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| function | `resolve_event_ticketing_owner_user_ids` | `supabase/migrations/20260825010000_ticketing_owner_account_resolution.sql` |
| function | `resolve_logistics_org_id` | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| function | `respond_to_booking_request` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| function | `respond_to_work_assignment` | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| function | `revoke_mfa_verification_code` | `supabase/migrations/20260918213707_mfa_verification_code_store.sql` |
| function | `revoke_org_invite` | `supabase/migrations/20260909195618_atomic_org_invites.sql` |
| function | `search_public_venues` | `supabase/migrations/20260823110000_public_venue_search_rpc.sql` |
| function | `send_artist_contract` | `supabase/migrations/20260328120000_artist_contracts_signing.sql` |
| function | `send_dm_request` | `supabase/migrations/20260825121000_phase1_rpc_actor_binding.sql` |
| function | `set_artist_epk_settings_updated_at` | `supabase/migrations/20260327150000_artist_epk_settings_active.sql` |
| function | `set_employment_assignments_updated_at` | `supabase/migrations/20260609000200_employment_assignments.sql` |
| function | `set_post_appearances_updated_at` | `supabase/migrations/20260728001001_post_appearances.sql` |
| function | `set_post_style_profile_default` | `supabase/migrations/20260728224543_harden_post_appearance_v2.sql` |
| function | `set_post_style_profiles_updated_at` | `supabase/migrations/20260728001000_post_style_profiles.sql` |
| function | `set_updated_at` | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| function | `should_send_notification` | `supabase/migrations/20260416000323_team_comms_fanout_and_rls_cleanup.sql` |
| function | `sign_artist_contract` | `supabase/migrations/20260328120000_artist_contracts_signing.sql` |
| function | `site_map_collaborator_active` | `supabase/migrations/20260823220000_site_map_bridge.sql` |
| function | `slugify_org_name` | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| function | `staffing_overview_counts` | `supabase/migrations/20260409133000_staffing_overview_rpc.sql` |
| function | `start_admin_onboarding` | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| function | `switch_active_account` | `supabase/migrations/archive/complete_migration.sql` |
| function | `sync_booking_legacy_status` | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| function | `sync_maintenance_completion` | `supabase/migrations/20260823210001_equipment_lifecycle.sql` |
| function | `sync_site_map_elements` | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| function | `sync_venue_public_profile_setting` | `supabase/migrations/20260823040000_venue_public_flag_unification.sql` |
| function | `sync_workforce_coordinator_channel_from_roster` | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| function | `test_music_upload_permissions` | `supabase/migrations/20250115000001_artist_storage_setup.sql` |
| function | `test_venue_profiles_setup` | `supabase/migrations/archive/VENUE_ACCESS_FIX.sql` |
| function | `ticketing_accept_invite` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_create_allocation` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_create_invite` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_decline_invite` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_expire_invites_and_allocations` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_release_allocation` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_replace_invite` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_resize_allocation` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_revoke_invite` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `ticketing_rotate_invite_token` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| function | `to` | `supabase/migrations/archive/workflow_migration_clean.sql` |
| function | `touch_opportunities_updated_at` | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| function | `touch_tour_events_updated_at` | `supabase/migrations/20260710032640_harden_tour_events_org_rls.sql` |
| function | `touch_updated_at` | `supabase/migrations/20250818121000_tours_core.sql` |
| function | `transition_venue_booking_lifecycle` | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| function | `unarchive_venue_profile` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `update_album_likes_count` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| function | `update_album_photo_count` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| function | `update_all_user_stats` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `update_artist_jobs_updated_at` | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| function | `update_comment_counters` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| function | `update_comment_counters_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| function | `update_comment_likes_count` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `update_comment_path` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| function | `update_conversation_last_message` | `supabase/migrations/20250121000001_messaging_system.sql` |
| function | `update_engagement_score` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `update_feature_flags_updated_at` | `supabase/migrations/20260604100000_content_moderation.sql` |
| function | `update_flight_passenger_counts` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| function | `update_follow_counts` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `update_follow_requests_updated_at` | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| function | `update_follower_counts` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `update_follower_counts_on_follow` | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| function | `update_foreign_keys_for_consolidation` | `supabase/migrations/archive/phase3-dynamic-migration.sql` |
| function | `update_forum_counters` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| function | `update_group_thread_on_message` | `supabase/migrations/20260520224000_group_threads_model.sql` |
| function | `update_hashtag_counts` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `update_job_application_count` | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| function | `update_job_view_count` | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| function | `update_photo_likes_count` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| function | `update_photo_purchases_count` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| function | `update_post_comments_count` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `update_post_count` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `update_post_counts` | `supabase/migrations/20250211000000_production_schema_optimization.sql` |
| function | `update_post_engagement_counts` | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| function | `update_post_likes_count` | `supabase/migrations/20240430000000_create_posts.sql` |
| function | `update_posts_count` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `update_project_timestamp` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| function | `update_shares_count` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| function | `update_site_map_updated_at` | `supabase/migrations/20250131000000_site_map_system.sql` |
| function | `update_subscription_counters` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| function | `update_subscriptions_updated_at` | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| function | `update_thread_hot_score` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| function | `update_ticket_sales_count` | `supabase/migrations/archive/setup_ticketing_database.sql` |
| function | `update_transportation_passenger_counts` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| function | `update_travel_group_counts` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| function | `update_updated_at_column` | `supabase/migrations/archive/workflow_migration_clean.sql` |
| function | `update_user_stats` | `supabase/migrations/archive/fix-real-time-account-updates.sql` |
| function | `update_venue_analytics_daily` | `supabase/migrations/archive/VENUE_MIGRATION_READY_TO_RUN.sql` |
| function | `update_venue_kit_settings_updated_at` | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| function | `update_vote_counters` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| function | `update_vote_counters_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| function | `upsert_account` | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| function | `venue_has_operator_access` | `supabase/migrations/20260823030000_rpc_authorization_hardening.sql` |
| function | `venue_is_owner` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| function | `worker_shift_check_in` | `supabase/migrations/20260823170000_worker_checkin_contract.sql` |
| function | `worker_shift_check_out` | `supabase/migrations/20260823170000_worker_checkin_contract.sql` |
| function | `write_venue_lifecycle_audit` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| materialized view | `forum_threads_hot_mv` | `supabase/migrations/20250816130000_scaling_indexes_forum.sql` |
| materialized view | `forum_threads_top_mv` | `supabase/migrations/20250816130000_scaling_indexes_forum.sql` |
| table | `account_activity_log` | `supabase/migrations/archive/complete_migration.sql` |
| table | `account_follows` | `supabase/migrations/20260712003357_account_follows.sql` |
| table | `account_relationships` | `supabase/migrations/archive/complete_migration.sql` |
| table | `accounts` | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| table | `achievement_progress_events` | `supabase/migrations/20260327123000_achievements_engine_catalog.sql` |
| table | `achievements` | `supabase/migrations/20260327123000_achievements_engine_catalog.sql` |
| table | `admin_acting_context_audit` | `supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql` |
| table | `admin_acting_context_sessions` | `supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql` |
| table | `admin_domain_transactions` | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| table | `admin_onboarding` | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| table | `admin_onboarding_steps` | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| table | `admin_publication_access_logs` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_acknowledgements` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_audiences` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_deliveries` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_outbox` | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| table | `admin_publication_ownership_quarantine` | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| table | `admin_publication_recipients` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_sections` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_share_tokens` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_publication_snapshots` | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| table | `admin_requests` | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| table | `admin_roles` | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| table | `advancing_documents` | `supabase/migrations/20260602110000_advancing_and_daysheets.sql` |
| table | `agency_artists` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `agent_audit_events` | `supabase/migrations/20260908130000_agent_service_identities.sql` |
| table | `agent_credentials` | `supabase/migrations/20260908130000_agent_service_identities.sql` |
| table | `agent_identities` | `supabase/migrations/20260908130000_agent_service_identities.sql` |
| table | `agreement_acceptances` | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| table | `agreement_templates` | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| table | `album_likes` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `application_form_templates` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `artist_blog_posts` | `supabase/migrations/archive/03_artist_content_tables.sql` |
| table | `artist_contracts` | `supabase/migrations/20250814120000_artist_business_core.sql` |
| table | `artist_dashboard_layouts` | `supabase/migrations/20250325120000_artist_dashboard_layouts.sql` |
| table | `artist_documents` | `supabase/migrations/archive/03_artist_content_tables.sql` |
| table | `artist_epk_settings` | `supabase/migrations/20260327150000_artist_epk_settings_active.sql` |
| table | `artist_events` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `artist_financial_transactions` | `supabase/migrations/20250814120000_artist_business_core.sql` |
| table | `artist_job_applications` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| table | `artist_job_categories` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| table | `artist_job_saves` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| table | `artist_job_views` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| table | `artist_jobs` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| table | `artist_marketing_campaigns` | `supabase/migrations/20250814120000_artist_business_core.sql` |
| table | `artist_merchandise` | `supabase/migrations/archive/03_artist_content_tables.sql` |
| table | `artist_music` | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| table | `artist_profiles` | `supabase/migrations/archive/missing_auth_tables.sql` |
| table | `artist_social_integration_secrets` | `supabase/migrations/20260825040000_integrations_manage_and_audit.sql` |
| table | `artist_social_integrations` | `supabase/migrations/20250904090000_artist_social_integrations.sql` |
| table | `artist_social_posts` | `supabase/migrations/20250814120000_artist_business_core.sql` |
| table | `artist_subscription_tiers` | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| table | `artist_works` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `audio_files` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `audit_log` | `supabase/migrations/20250816133000_event_core.sql` |
| table | `backline_fulfillments` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `backline_requirements` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `backline_substitution_approvals` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `badges` | `supabase/migrations/20260327123000_achievements_engine_catalog.sql` |
| table | `booking_requests` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `bookings` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `budgets` | `supabase/migrations/20260328140000_financial_tables.sql` |
| table | `calendars` | `supabase/migrations/20250816133000_event_core.sql` |
| table | `catering_dietary_summaries` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `catering_headcount_snapshots` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `catering_services` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `collaboration_applications` | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| table | `collaboration_invitations` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `collaboration_projects` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `comment_likes` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| table | `communication_channels` | `supabase/migrations/20250100000000_create_missing_auth_tables.sql` |
| table | `connect_sessions` | `supabase/migrations/20260410130000_connect_sessions.sql` |
| table | `connect_telemetry_events` | `supabase/migrations/20260410143000_connect_telemetry_events.sql` |
| table | `content_kind` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `content_refs` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `content_reports` | `supabase/migrations/20260413300001_content_reports.sql` |
| table | `contracts` | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| table | `conversations` | `supabase/migrations/archive/quick_messaging_fix.sql` |
| table | `cross_account_permissions` | `supabase/migrations/archive/complete_migration.sql` |
| table | `day_sheet_receipts` | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| table | `day_sheets` | `supabase/migrations/20260602110000_advancing_and_daysheets.sql` |
| table | `document_folders` | `supabase/migrations/20260823190000_document_folders.sql` |
| table | `employment_assignments` | `supabase/migrations/20260609000200_employment_assignments.sql` |
| table | `endorsements` | `supabase/migrations/20260327123000_achievements_engine_catalog.sql` |
| table | `entity_managers` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `epk_telemetry` | `supabase/migrations/20260327153000_epk_telemetry.sql` |
| table | `equipment_assets` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `equipment_catalog` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `equipment_instances` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `equipment_locations` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `equipment_maintenance_log` | `supabase/migrations/20260823210001_equipment_lifecycle.sql` |
| table | `equipment_power_connections` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `equipment_qr_codes` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `equipment_reservations` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `equipment_setup_tasks` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `equipment_setup_workflows` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `event_analytics` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_analytics_daily` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_attendance` | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| table | `event_budgets` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_bulletins` | `supabase/migrations/20260413210000_event_communications_system.sql` |
| table | `event_calendar_items` | `supabase/migrations/20260413120000_event_hq_tables.sql` |
| table | `event_crew_assignments` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| table | `event_documents` | `supabase/migrations/20260413210000_event_communications_system.sql` |
| table | `event_expenses` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_group_chats` | `supabase/migrations/20260413210000_event_communications_system.sql` |
| table | `event_group_messages` | `supabase/migrations/20260413210000_event_communications_system.sql` |
| table | `event_guestlist` | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| table | `event_locations` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `event_marketing_campaigns` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_package_assets` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `event_package_services` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `event_packages` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `event_participants` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `event_promo_codes` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_resources` | `supabase/migrations/20260413120000_event_hq_tables.sql` |
| table | `event_secure_uploads` | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| table | `event_task_messages` | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| table | `event_team_members` | `supabase/migrations/archive/04_event_management_tables.sql` |
| table | `event_ticket_types` | `supabase/migrations/20250814090000_event_extensions.sql` |
| table | `event_ticketing_config` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `event_ticketing_grants` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `event_vendor_requests` | `supabase/migrations/20260328150000_event_vendor_requests.sql` |
| table | `event_zones` | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| table | `events` | `supabase/migrations/archive/02_core_tables.sql` |
| table | `events_v2` | `supabase/migrations/20250816133000_event_core.sql` |
| table | `feature_flags` | `supabase/migrations/20260604100000_content_moderation.sql` |
| table | `feed_events` | `supabase/migrations/20250813130000_promotion_core.sql` |
| table | `financial_transactions` | `supabase/migrations/20260328140000_financial_tables.sql` |
| table | `flight_coordination` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `flight_passenger_assignments` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `follow_requests` | `supabase/migrations/archive/fix-notifications-safe.sql` |
| table | `follows` | `supabase/migrations/20250813130000_promotion_core.sql` |
| table | `for` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `forum_comments` | `supabase/migrations/20250815111000_forums_core.sql` |
| table | `forum_kind` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `forum_moderators` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `forum_posts` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `forum_posts_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| table | `forum_reports` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `forum_subscriptions` | `supabase/migrations/20250815111000_forums_core.sql` |
| table | `forum_subscriptions_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| table | `forum_tags` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `forum_thread_tags` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `forum_threads` | `supabase/migrations/20250815111000_forums_core.sql` |
| table | `forum_threads_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| table | `forum_votes` | `supabase/migrations/20250815111000_forums_core.sql` |
| table | `forum_votes_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| table | `forums` | `supabase/migrations/20250815111000_forums_core.sql` |
| table | `forums_v2` | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| table | `geo_external_references` | `supabase/migrations/20260822021738_world_shared_geography_foundation.sql` |
| table | `geo_place_aliases` | `supabase/migrations/20260822021738_world_shared_geography_foundation.sql` |
| table | `geo_places` | `supabase/migrations/20260822021738_world_shared_geography_foundation.sql` |
| table | `glamping_tents` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `ground_transportation_coordination` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `group_messages` | `supabase/migrations/20260520224000_group_threads_model.sql` |
| table | `group_threads` | `supabase/migrations/20260520224000_group_threads_model.sql` |
| table | `hashtags` | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| table | `hiring_audit_events` | `supabase/migrations/20260330120000_hiring_audit_events.sql` |
| table | `hiring_eligibility_snapshots` | `supabase/migrations/20260409183000_hiring_eligibility_gate.sql` |
| table | `holds` | `supabase/migrations/20250816133000_event_core.sql` |
| table | `hotel_room_assignments` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `IF` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `incidents` | `supabase/migrations/20250816140000_incidents.sql` |
| table | `integration_audit_log` | `supabase/migrations/20260825040000_integrations_manage_and_audit.sql` |
| table | `job_applications` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `job_posting_templates` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `locations` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `lodging_availability` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `lodging_bookings` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `lodging_calendar_events` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `lodging_guest_assignments` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `lodging_payments` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `lodging_providers` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `lodging_room_types` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `logistics_acknowledgements` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `logistics_activity` | `supabase/migrations/20250813104500_logistics_activity.sql` |
| table | `logistics_comms_channels` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `logistics_comms_plans` | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| table | `logistics_task_equipment` | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| table | `logistics_tasks` | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| table | `map_issues` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `map_layers` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `map_measurements` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `map_task_assignments` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `map_templates` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `map_versions` | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| table | `marketplace_entitlements` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_integrations` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_listing_variants` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_listings` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_moderation_queue` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_order_items` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_orders` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_payout_ledger` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_service_milestones` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `marketplace_storefronts` | `supabase/migrations/20260410120000_marketplace_core.sql` |
| table | `messages` | `supabase/migrations/archive/ensure-music-tables.sql` |
| table | `mfa_verification_codes` | `supabase/migrations/20260918213707_mfa_verification_code_store.sql` |
| table | `music_comments` | `supabase/migrations/archive/ensure-music-tables.sql` |
| table | `music_engagement_events` | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| table | `music_likes` | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| table | `music_playlist_items` | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| table | `music_playlist_shares` | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| table | `music_playlists` | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| table | `music_plays` | `supabase/migrations/archive/ensure-music-tables.sql` |
| table | `music_preview_generation_jobs` | `supabase/migrations/20260711173622_music_preview_jobs.sql` |
| table | `music_shares` | `supabase/migrations/archive/ensure-music-tables.sql` |
| table | `notification_delivery_log` | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| table | `notification_events` | `supabase/migrations/20260413110000_notification_events_table.sql` |
| table | `notification_preferences` | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| table | `notifications` | `supabase/migrations/archive/workflow_migration_clean.sql` |
| table | `notifications_v2` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `offers` | `supabase/migrations/20250816135000_offers_contracts.sql` |
| table | `onboarding` | `supabase/migrations/archive/simple_auth_fix.sql` |
| table | `onboarding_flows` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `onboarding_responses` | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| table | `onboarding_steps` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `onboarding_templates` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `onboarding_workflows` | `supabase/migrations/archive/workflow_migration_clean.sql` |
| table | `opportunities` | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| table | `org_invites` | `supabase/migrations/20250816132000_org_rbac.sql` |
| table | `org_members` | `supabase/migrations/20250816132000_org_rbac.sql` |
| table | `org_role_permissions` | `supabase/migrations/20250816132000_org_rbac.sql` |
| table | `organization_artist_members` | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| table | `organization_social_integrations` | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| table | `organization_social_media_insights` | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| table | `organizations` | `supabase/migrations/20250816132000_org_rbac.sql` |
| table | `organizer_accounts` | `supabase/migrations/20260604100000_content_moderation.sql` |
| table | `organizer_pages` | `supabase/migrations/20250813130000_promotion_core.sql` |
| table | `performance_agencies` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `photo_albums` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `photo_comments` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `photo_likes` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `photo_purchases` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `photo_tags` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `photos` | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| table | `platform_webhook_events` | `supabase/migrations/20260823200000_platform_webhook_events.sql` |
| table | `portfolio_items` | `supabase/migrations/20250819102000_profile_content_core.sql` |
| table | `post_appearance_revisions` | `supabase/migrations/20260728001002_post_appearance_revisions.sql` |
| table | `post_appearances` | `supabase/migrations/20260728001001_post_appearances.sql` |
| table | `post_collaborators` | `supabase/migrations/20250813130000_promotion_core.sql` |
| table | `post_comments` | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| table | `post_hashtags` | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| table | `post_kind` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `post_likes` | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| table | `post_media` | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| table | `post_shares` | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| table | `post_style_profiles` | `supabase/migrations/20260728001000_post_style_profiles.sql` |
| table | `posts` | `supabase/migrations/archive/fix_posts_schema.sql` |
| table | `power_distribution` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `private` | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| table | `production_companies` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `profile_certifications` | `supabase/migrations/20250819102000_profile_content_core.sql` |
| table | `profile_experiences` | `supabase/migrations/20250819102000_profile_content_core.sql` |
| table | `profiles` | `supabase/migrations/archive/missing_auth_tables.sql` |
| table | `project_activity` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `project_collaborators` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `project_files` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `project_tasks` | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| table | `promo_codes` | `supabase/migrations/20260328130000_ticketing_v2.sql` |
| table | `promoters` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `promotion_posts` | `supabase/migrations/20250813130000_promotion_core.sql` |
| table | `rbac_permission_audit_log` | `supabase/migrations/20250812090000_entity_rbac_core.sql` |
| table | `rbac_permissions` | `supabase/migrations/20250812090000_entity_rbac_core.sql` |
| table | `rbac_role_permissions` | `supabase/migrations/20250812090000_entity_rbac_core.sql` |
| table | `rbac_roles` | `supabase/migrations/20250812090000_entity_rbac_core.sql` |
| table | `rbac_user_entity_roles` | `supabase/migrations/20250812090000_entity_rbac_core.sql` |
| table | `rbac_user_permission_overrides` | `supabase/migrations/20250812090000_entity_rbac_core.sql` |
| table | `rental_agreement_items` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `rental_agreements` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `rental_clients` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `rental_companies` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `rental_payments` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `required_docs` | `supabase/migrations/20250816135000_offers_contracts.sql` |
| table | `resume_achievement_highlights` | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| table | `reward_transactions` | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| table | `schedule_items` | `supabase/migrations/20250816134000_tasks_schedule.sql` |
| table | `scheduled_posts` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `schedules` | `supabase/migrations/20250816134000_tasks_schedule.sql` |
| table | `secure_audit_log` | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| table | `signatures` | `supabase/migrations/20250816135000_offers_contracts.sql` |
| table | `site_map_activity_log` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `site_map_collaborators` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `site_map_elements` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `site_map_zones` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `site_maps` | `supabase/migrations/20250131000000_site_map_system.sql` |
| table | `skill_endorsements` | `supabase/migrations/20250819102000_profile_content_core.sql` |
| table | `social_media_performance` | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| table | `staff_applications` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `staff_contracts` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `staff_documents` | `supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql` |
| table | `staff_invitations` | `supabase/migrations/20250813123000_create_staff_invitations_if_missing.sql` |
| table | `staff_jobs` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `staff_member_skills` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| table | `staff_members` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `staff_messages` | `supabase/migrations/20250818121500_notifications_and_staff_messages.sql` |
| table | `staff_onboarding` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `staff_onboarding_candidates` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `staff_onboarding_sensitive_vault` | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| table | `staff_onboarding_steps` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `staff_onboarding_templates` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `staff_performance_metrics` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `staff_reviews` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| table | `staff_schedules` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `staff_shift_assignments` | `supabase/migrations/20260714015225_hiring_hub_roster_management_compat.sql` |
| table | `staff_shifts` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `staff_zones` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `staffing_agencies` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `staffing_agency_staff` | `supabase/migrations/20250812090500_entity_domain_expansion.sql` |
| table | `staffing_alert_events` | `supabase/migrations/20260409142000_staffing_alert_events.sql` |
| table | `staffing_api_telemetry` | `supabase/migrations/20260409140000_staffing_api_telemetry.sql` |
| table | `staffing_overview_cache` | `supabase/migrations/20260409134500_staffing_overview_cache.sql` |
| table | `subscriptions` | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| table | `tasks` | `supabase/migrations/20250816134000_tasks_schedule.sql` |
| table | `team_communications` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `team_project_assignments` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| table | `thread_members` | `supabase/migrations/20260520224000_group_threads_model.sql` |
| table | `ticket_allocation_managers` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| table | `ticket_allocations` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_analytics` | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| table | `ticket_analytics_events` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_campaigns` | `supabase/migrations/20260328130000_ticketing_v2.sql` |
| table | `ticket_checkins` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_checkpoints` | `supabase/migrations/20260825020000_door_operations.sql` |
| table | `ticket_credentials` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_inventory_reservations` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_invites` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| table | `ticket_ownership_events` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_referrals` | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| table | `ticket_revenue_allocations` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_sales` | `supabase/migrations/archive/setup_ticketing_database.sql` |
| table | `ticket_shares` | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| table | `ticket_stripe_webhook_events` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_transfers` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `ticket_types` | `supabase/migrations/archive/setup_ticketing_database.sql` |
| table | `ticketing_migration_issues` | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| table | `tickets` | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| table | `tour_artists` | `supabase/migrations/20250818121000_tours_core.sql` |
| table | `tour_collaboration_invitations` | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| table | `tour_events` | `supabase/migrations/20250818121000_tours_core.sql` |
| table | `tour_plan_quarantine` | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| table | `tour_stops` | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| table | `tour_team_members` | `supabase/migrations/archive/fix_tour_tables.sql` |
| table | `tour_teams` | `supabase/migrations/20250818121000_tours_core.sql` |
| table | `tour_vendors` | `supabase/migrations/archive/fix_tour_tables.sql` |
| table | `tour_versions` | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| table | `tours` | `supabase/migrations/archive/critical_missing_tables.sql` |
| table | `transportation_passenger_assignments` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `travel_coordination_timeline` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `travel_group_members` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `travel_groups` | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| table | `user_accounts` | `supabase/migrations/archive/COMPREHENSIVE_SCALABLE_SOLUTION.sql` |
| table | `user_achievements` | `supabase/migrations/20260327123000_achievements_engine_catalog.sql` |
| table | `user_active_profiles` | `supabase/migrations/archive/emergency-fix-safe.sql` |
| table | `user_badges` | `supabase/migrations/20260327123000_achievements_engine_catalog.sql` |
| table | `user_music_library` | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| table | `user_opportunity_interactions` | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| table | `user_profile_featured_tracks` | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| table | `user_reward_wallets` | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| table | `user_sessions` | `supabase/migrations/archive/simple_auth_fix.sql` |
| table | `vendor_contracts` | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| table | `venue_analytics` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_availability` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_booking_lifecycle_history` | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| table | `venue_booking_requests` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_booking_slots` | `supabase/migrations/20250814124500_venue_recurring.sql` |
| table | `venue_contacts` | `supabase/migrations/20260823080000_contact_reconciliation.sql` |
| table | `venue_crew_members` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| table | `venue_documents` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_equipment` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_identity_bridges` | `supabase/migrations/20260823010000_venue_identity_bridge.sql` |
| table | `venue_kit_settings` | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| table | `venue_manual_transactions` | `supabase/migrations/20260825030000_analytics_truth.sql` |
| table | `venue_ownership_transfers` | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| table | `venue_permissions` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `venue_pricing` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_profiles` | `supabase/migrations/archive/VENUE_ACCESS_FIX.sql` |
| table | `venue_recurring_shifts` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `venue_recurring_templates` | `supabase/migrations/20250814124500_venue_recurring.sql` |
| table | `venue_reservations` | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| table | `venue_reviews` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_role_permissions` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `venue_roles` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `venue_shift_assignments` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `venue_shifts` | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| table | `venue_slug_history` | `supabase/migrations/20260823020000_venue_slug_repair.sql` |
| table | `venue_social_integration_secrets` | `supabase/migrations/20260823031000_integration_token_vault.sql` |
| table | `venue_social_integrations` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_team_contractors` | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| table | `venue_team_members` | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| table | `venue_workflow_subscriptions` | `supabase/migrations/20260825050000_venue_notification_routing.sql` |
| table | `venues` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `venues_v2` | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| table | `vote_kind` | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| table | `work_mode_publication_audiences` | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| table | `work_mode_publications` | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| table | `worker_onboarding_profiles` | `supabase/migrations/20260709210901_worker_onboarding_profiles.sql` |
| table | `workflow_events_audit` | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| table | `workflow_executions` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `workflow_messages` | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| table | `workflow_participants` | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| table | `workflow_tasks` | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| table | `workflow_templates` | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| table | `workflow_threads` | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| table | `workforce_channel_links` | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| table | `world_artist_places` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_claim_evidence` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_claims` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_cultural_entities` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_cultural_entity_places` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_cultural_relationships` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_geo_signals` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_ingestion_candidates` | `supabase/migrations/20260822021741_world_music_ingestion_staging.sql` |
| table | `world_ingestion_runs` | `supabase/migrations/20260822021741_world_music_ingestion_staging.sql` |
| table | `world_media_assets` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_media_sources` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_radio_station_places` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_radio_stations` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_radio_streams` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_relation_types` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_sources` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| table | `world_track_places` | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| type | `express` | `supabase/migrations/20260415140000_stripe_connect_option_b_parallel.sql` |
| view | `cannot` | `supabase/migrations/20260412140000_music_tracks_view_add_avatar.sql` |
| view | `entities_all` | `supabase/migrations/20250812094000_entity_views.sql` |
| view | `entities_artists` | `supabase/migrations/20250812094000_entity_views.sql` |
| view | `entities_individuals` | `supabase/migrations/20250812094000_entity_views.sql` |
| view | `entities_venues` | `supabase/migrations/20250812094000_entity_views.sql` |
| view | `friend_suggestions_view` | `supabase/migrations/20250131000004_friend_suggestions_system.sql` |
| view | `music_tracks` | `supabase/migrations/20260711165607_native_music_player_hardening.sql` |
| view | `policy` | `supabase/migrations/archive/emergency-fix-safe.sql` |
| view | `public_venue_availability` | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| view | `tour_plan_normalize_stats_v` | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| view | `unified_staff_roster` | `supabase/migrations/20260602120000_unified_staff_roster.sql` |
| view | `venue_identity_bridge_audit` | `supabase/migrations/20260823010000_venue_identity_bridge.sql` |
| view | `work_hub_integrity_issues` | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |

## RLS policies (1299)

| Table | Policy | Latest create evidence |
| --- | --- | --- |
| `account_activity_log` | account_activity_log_owner_insert | `supabase/migrations/20260825121000_phase1_rpc_actor_binding.sql` |
| `account_activity_log` | account_activity_log_owner_select | `supabase/migrations/20260825121000_phase1_rpc_actor_binding.sql` |
| `account_activity_log` | Admins can view all activity | `supabase/migrations/archive/complete_migration.sql` |
| `account_activity_log` | System can insert activity logs | `supabase/migrations/archive/complete_migration.sql` |
| `account_activity_log` | Users can view their activity log | `supabase/migrations/archive/06_policies_indexes.sql` |
| `account_activity_log` | Users can view their own activity | `supabase/migrations/archive/complete_migration.sql` |
| `account_follows` | account_follows_delete_own | `supabase/migrations/20260712003357_account_follows.sql` |
| `account_follows` | account_follows_insert_own | `supabase/migrations/20260712003357_account_follows.sql` |
| `account_follows` | account_follows_select | `supabase/migrations/20260712003357_account_follows.sql` |
| `account_relationships` | account_relationships_insert_own | `supabase/migrations/20260607120000_account_relationships_ownership_rls.sql` |
| `account_relationships` | account_relationships_owner_manage | `supabase/migrations/20260607120000_account_relationships_ownership_rls.sql` |
| `account_relationships` | Users can manage their account relationships | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `account_relationships` | Users can manage their own account relationships | `supabase/migrations/archive/complete_migration.sql` |
| `account_relationships` | Users can view their account relationships | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `account_relationships` | Users can view their own account relationships | `supabase/migrations/archive/complete_migration.sql` |
| `accounts` | accounts_owner_manage | `supabase/migrations/20260711182530_organization_personas_integration.sql` |
| `accounts` | accounts_public_active_read | `supabase/migrations/20260711182530_organization_personas_integration.sql` |
| `accounts` | Users can delete their own account | `supabase/migrations/archive/phase2-security-policies.sql` |
| `accounts` | Users can delete their own accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `accounts` | Users can insert their own account | `supabase/migrations/archive/phase2-security-policies.sql` |
| `accounts` | Users can insert their own accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `accounts` | Users can read all accounts | `supabase/migrations/archive/phase2-security-policies.sql` |
| `accounts` | Users can update their own account | `supabase/migrations/archive/phase2-security-policies.sql` |
| `accounts` | Users can update their own accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `accounts` | Users can view their own accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `achievement_progress_events` | achievement_progress_events_insert_own | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `achievement_progress_events` | achievement_progress_events_select_own | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `admin_domain_transactions` | admin_domain_transactions_select_org | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| `admin_domain_transactions` | admin_domain_transactions_service | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| `admin_onboarding` | Users can insert their own onboarding | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| `admin_onboarding` | Users can update their own onboarding | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| `admin_onboarding` | Users can view their own onboarding | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| `admin_onboarding_steps` | Everyone can view onboarding steps | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| `admin_publication_access_logs` | pub102_access_logs_insert | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_access_logs` | pub102_access_logs_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_access_logs` | pub102_access_logs_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_acknowledgements` | pub102_acks_insert | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_acknowledgements` | pub102_acks_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_acknowledgements` | pub102_acks_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_audiences` | pub102_audiences_insert | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_audiences` | pub102_audiences_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_audiences` | pub102_audiences_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_audiences` | pub102_audiences_update | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_deliveries` | pub102_deliveries_insert | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_deliveries` | pub102_deliveries_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_deliveries` | pub102_deliveries_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_deliveries` | pub102_deliveries_update | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_outbox` | admin_publication_outbox_select_org | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| `admin_publication_outbox` | admin_publication_outbox_service | `supabase/migrations/20260720170000_admin_publication_outbox_pub101.sql` |
| `admin_publication_ownership_quarantine` | pub102_ownership_quarantine_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_ownership_quarantine` | pub102_ownership_quarantine_service | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_recipients` | pub102_recipients_insert | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_recipients` | pub102_recipients_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_recipients` | pub102_recipients_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_recipients` | pub102_recipients_update | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_sections` | pub102_sections_insert | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_sections` | pub102_sections_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_sections` | pub102_sections_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_sections` | pub102_sections_update | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_share_tokens` | pub102_share_tokens_insert | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_share_tokens` | pub102_share_tokens_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_share_tokens` | pub102_share_tokens_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_share_tokens` | pub102_share_tokens_update | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_snapshots` | pub102_snapshots_insert | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` |
| `admin_publication_snapshots` | pub102_snapshots_select | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` |
| `admin_publication_snapshots` | pub102_snapshots_service | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_publication_snapshots` | pub102_snapshots_update | `supabase/migrations/20260720171000_admin_publication_schema_pub102.sql` |
| `admin_requests` | admin_requests_owner_insert | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| `admin_requests` | admin_requests_owner_select | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| `admin_roles` | Everyone can view admin roles | `supabase/migrations/archive/admin_onboarding_migration.sql` |
| `advancing_documents` | advancing_select | `supabase/migrations/20260602110000_advancing_and_daysheets.sql` |
| `advancing_documents` | advancing_write | `supabase/migrations/20260602110000_advancing_and_daysheets.sql` |
| `agency_artists` | agency_artists_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `agreement_acceptances` | agreement_acceptances_insert_own | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| `agreement_acceptances` | agreement_acceptances_select_own | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| `agreement_templates` | agreement_templates_read | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| `album_likes` | Anyone can view album likes | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `album_likes` | Authenticated users can like albums | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `album_likes` | Users can unlike albums they liked | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `application_form_templates` | insert_app_forms | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `application_form_templates` | read_all_app_forms | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `artist_blog_posts` | Public can view published blog posts | `supabase/migrations/20260702210503_account_aware_blog_publishing.sql` |
| `artist_blog_posts` | Users can create blogs attributed to owned entities | `supabase/migrations/20260711182530_organization_personas_integration.sql` |
| `artist_blog_posts` | Users can delete their own blog posts | `supabase/migrations/20260702210503_account_aware_blog_publishing.sql` |
| `artist_blog_posts` | Users can manage their own blog posts | `supabase/migrations/archive/06_policies_indexes.sql` |
| `artist_blog_posts` | Users can view published blog posts | `supabase/migrations/archive/06_policies_indexes.sql` |
| `artist_contracts` | artist_contracts_counterparty_select | `supabase/migrations/20260328120000_artist_contracts_signing.sql` |
| `artist_contracts` | artist_contracts_owner_all | `supabase/migrations/20260328120000_artist_contracts_signing.sql` |
| `artist_contracts` | Artists can manage their own contracts | `supabase/migrations/20250814120000_artist_business_core.sql` |
| `artist_dashboard_layouts` | Users can delete own artist dashboard layout | `supabase/migrations/20250325120000_artist_dashboard_layouts.sql` |
| `artist_dashboard_layouts` | Users can insert own artist dashboard layout | `supabase/migrations/20250325120000_artist_dashboard_layouts.sql` |
| `artist_dashboard_layouts` | Users can read own artist dashboard layout | `supabase/migrations/20250325120000_artist_dashboard_layouts.sql` |
| `artist_dashboard_layouts` | Users can update own artist dashboard layout | `supabase/migrations/20250325120000_artist_dashboard_layouts.sql` |
| `artist_documents` | Users can manage their own documents | `supabase/migrations/archive/06_policies_indexes.sql` |
| `artist_documents` | Users can view public documents | `supabase/migrations/archive/06_policies_indexes.sql` |
| `artist_epk_settings` | Public can read public EPK settings | `supabase/migrations/20260327150000_artist_epk_settings_active.sql` |
| `artist_epk_settings` | Users can insert own epk settings | `supabase/migrations/20260327150000_artist_epk_settings_active.sql` |
| `artist_epk_settings` | Users can update own epk settings | `supabase/migrations/20260327150000_artist_epk_settings_active.sql` |
| `artist_epk_settings` | Users can view own epk settings | `supabase/migrations/20260327150000_artist_epk_settings_active.sql` |
| `artist_events` | Users can manage their own artist events | `supabase/migrations/archive/critical_missing_tables.sql` |
| `artist_events` | Users can view public artist events | `supabase/migrations/archive/critical_missing_tables.sql` |
| `artist_financial_transactions` | Artists can manage their own transactions | `supabase/migrations/20250814120000_artist_business_core.sql` |
| `artist_job_applications` | Job posters can update application status | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_applications` | Users can create applications | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_applications` | Users can update their own applications | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_applications` | Users can view applications to their jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_categories` | Anyone can view job categories | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_saves` | Users can manage their own saves | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_views` | Users can create job views | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_job_views` | Users can view job views for their jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_jobs` | Anyone can view open jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_jobs` | artist_jobs_create | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `artist_jobs` | artist_jobs_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `artist_jobs` | artist_jobs_tour_private_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `artist_jobs` | artist_jobs_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `artist_jobs` | Artists can create collaboration jobs | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| `artist_jobs` | Authenticated users can create jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_jobs` | public_read_open_artist_jobs | `supabase/migrations/20260714000825_allow_public_read_open_jobs.sql` |
| `artist_jobs` | Users can delete their own jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_jobs` | Users can update their own jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_jobs` | Users can view their own jobs | `supabase/migrations/20241220000000_artist_jobs_system.sql` |
| `artist_marketing_campaigns` | Artists can manage their own campaigns | `supabase/migrations/20250814120000_artist_business_core.sql` |
| `artist_merchandise` | Users can manage their own merchandise | `supabase/migrations/archive/06_policies_indexes.sql` |
| `artist_merchandise` | Users can view active merchandise | `supabase/migrations/archive/06_policies_indexes.sql` |
| `artist_music` | Anyone can view public music | `supabase/migrations/archive/fix-music-rls-policies.sql` |
| `artist_music` | Artists can delete their own music | `supabase/migrations/archive/fix-music-rls-policies.sql` |
| `artist_music` | Artists can update their own music | `supabase/migrations/archive/fix-music-rls-policies.sql` |
| `artist_music` | Artists can upload their own music | `supabase/migrations/archive/simple-music-rls-fix.sql` |
| `artist_music` | Artists can view their own music | `supabase/migrations/archive/fix-music-rls-policies.sql` |
| `artist_music` | music_delete_policy | `supabase/migrations/archive/fix-rls-conflicts.sql` |
| `artist_music` | music_insert_policy | `supabase/migrations/archive/fix-rls-conflicts.sql` |
| `artist_music` | music_select_policy | `supabase/migrations/archive/fix-rls-conflicts.sql` |
| `artist_music` | music_update_policy | `supabase/migrations/archive/fix-rls-conflicts.sql` |
| `artist_music` | Public approved music is viewable by everyone | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `artist_music` | Public music is viewable by everyone | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `artist_music` | Users can delete their own music | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `artist_music` | Users can insert their own music | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `artist_music` | Users can update their own music | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `artist_music` | Users can view their own music | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `artist_profiles` | Anyone can view artist profiles | `supabase/migrations/archive/fix_artist_settings_table.sql` |
| `artist_profiles` | Artist profiles are viewable by everyone | `supabase/migrations/archive/complete_migration.sql` |
| `artist_profiles` | Public can view verified artist profiles | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `artist_profiles` | Users can delete their own artist profile | `supabase/migrations/archive/fix_artist_settings_table.sql` |
| `artist_profiles` | Users can insert their own artist profile | `supabase/migrations/archive/fix_artist_settings_table.sql` |
| `artist_profiles` | Users can manage their own artist profile | `supabase/migrations/archive/fix-music-rls-policies.sql` |
| `artist_profiles` | Users can manage their own artist profiles | `supabase/migrations/archive/missing_auth_tables.sql` |
| `artist_profiles` | Users can update their own artist profile | `supabase/migrations/archive/fix_artist_settings_table.sql` |
| `artist_profiles` | Users can view all artist profiles | `supabase/migrations/archive/missing_auth_tables.sql` |
| `artist_profiles` | Users can view public artist profiles | `supabase/migrations/archive/fix-music-rls-policies.sql` |
| `artist_profiles` | Users can view their own artist profiles | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `artist_social_integrations` | Users manage own artist social integrations | `supabase/migrations/20250904090000_artist_social_integrations.sql` |
| `artist_social_posts` | Artists can manage their own posts | `supabase/migrations/20250814120000_artist_business_core.sql` |
| `artist_subscription_tiers` | Anyone can view active tiers | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| `artist_subscription_tiers` | Users can manage their own tiers | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| `artist_works` | Users can manage their own artist works | `supabase/migrations/archive/critical_missing_tables.sql` |
| `artist_works` | Users can view public artist works | `supabase/migrations/archive/critical_missing_tables.sql` |
| `audio_files` | System can create audio metadata | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `audio_files` | Users can create audio metadata for permitted files | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `audio_files` | Users can view audio metadata | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `audit_log` | audit_select | `supabase/migrations/20250816133000_event_core.sql` |
| `backline_fulfillments` | backline_fulfillments_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `backline_requirements` | backline_requirements_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `backline_substitution_approvals` | backline_subs_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `betalaunch` | betalaunch_insert_authenticated | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `booking_requests` | booking_requests_own | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `booking_requests` | booking_requests_read_auth | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `booking_requests` | Users can manage their own booking requests | `supabase/migrations/archive/critical_missing_tables.sql` |
| `bookings` | Users can manage their own bookings | `supabase/migrations/archive/critical_missing_tables.sql` |
| `budgets` | budgets_all | `supabase/migrations/20260328140000_financial_tables.sql` |
| `budgets` | budgets_org_member | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `calendars` | cal_insert | `supabase/migrations/20250816133000_event_core.sql` |
| `calendars` | cal_select | `supabase/migrations/20250816133000_event_core.sql` |
| `calendars` | cal_update | `supabase/migrations/20250816133000_event_core.sql` |
| `catering_dietary_summaries` | catering_dietary_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `catering_headcount_snapshots` | catering_snapshots_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `catering_services` | catering_services_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `collaboration_applications` | Authenticated users can apply to collaborations | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| `collaboration_applications` | Job posters can update collaboration application status | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| `collaboration_applications` | Users can update their own collaboration applications | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| `collaboration_applications` | Users can view applications for their collaboration jobs | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| `collaboration_applications` | Users can view their own collaboration applications | `supabase/migrations/20250120000000_extend_artist_jobs_for_collaborations.sql` |
| `collaboration_invitations` | Authorized users can send invitations | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_invitations` | Users can respond to invitations | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_invitations` | Users can view sent invitations | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_invitations` | Users can view their invitations | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_projects` | Project owners and admins can update projects | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_projects` | Project owners can delete projects | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_projects` | Users can create projects | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `collaboration_projects` | Users can view projects they collaborate on | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `comment_likes` | Comment likes are viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `comment_likes` | Users can like comments | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `comment_likes` | Users can unlike comments | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `comments` | Users can delete their own comments | `supabase/migrations/archive/phase2-security-policies.sql` |
| `comments` | Users can insert their own comments | `supabase/migrations/archive/phase2-security-policies.sql` |
| `comments` | Users can read all comments | `supabase/migrations/archive/phase2-security-policies.sql` |
| `comments` | Users can update their own comments | `supabase/migrations/archive/phase2-security-policies.sql` |
| `communication_channels` | communication_channels_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `connect_sessions` | connect_sessions_insert_owner | `supabase/migrations/20260410130000_connect_sessions.sql` |
| `connect_sessions` | connect_sessions_select_involved_users | `supabase/migrations/20260410130000_connect_sessions.sql` |
| `connect_sessions` | connect_sessions_update_claim_or_owner | `supabase/migrations/20260410130000_connect_sessions.sql` |
| `connect_telemetry_events` | connect_telemetry_events_insert_authenticated | `supabase/migrations/20260410143000_connect_telemetry_events.sql` |
| `content_kind` | content_kind_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `content_refs` | content_refs:create | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `content_refs` | content_refs:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `content_reports` | Users can create reports | `supabase/migrations/20260413300001_content_reports.sql` |
| `content_reports` | Users can view own reports | `supabase/migrations/20260413300001_content_reports.sql` |
| `contracts` | contracts_org_member_all | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| `conversations` | conversations_update_participant | `supabase/migrations/20260823160000_messaging_isolation.sql` |
| `conversations` | Users can create conversations | `supabase/migrations/archive/quick_messaging_fix_corrected.sql` |
| `conversations` | Users can update their conversations | `supabase/migrations/archive/manual_fix_messaging_schema.sql` |
| `conversations` | Users can view their conversations | `supabase/migrations/archive/quick_messaging_fix_corrected.sql` |
| `cross_account_permissions` | Grantees can view permissions granted to them | `supabase/migrations/archive/complete_migration.sql` |
| `cross_account_permissions` | Profile owners can manage permissions for their profiles | `supabase/migrations/archive/complete_migration.sql` |
| `day_sheet_receipts` | day_sheet_receipts_acknowledge | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `day_sheet_receipts` | day_sheet_receipts_manage | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `day_sheet_receipts` | day_sheet_receipts_select | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `day_sheets` | day_sheets_select | `supabase/migrations/20260602110000_advancing_and_daysheets.sql` |
| `day_sheets` | day_sheets_write | `supabase/migrations/20260602110000_advancing_and_daysheets.sql` |
| `document_folders` | document_folders_owner | `supabase/migrations/20260823190000_document_folders.sql` |
| `employment_assignments` | assignment_status_update | `supabase/migrations/20260609000200_employment_assignments.sql` |
| `employment_assignments` | employment_assignments_worker_read_own | `supabase/migrations/20260625000000_polymorphic_hiring_entity.sql` |
| `employment_assignments` | organizers_can_create_assignments | `supabase/migrations/20260609000200_employment_assignments.sql` |
| `employment_assignments` | organizers_can_read_issued_assignments | `supabase/migrations/20260609000200_employment_assignments.sql` |
| `employment_assignments` | users_can_read_own_assignments | `supabase/migrations/20260609000200_employment_assignments.sql` |
| `entity_managers` | entity_managers_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `epk_telemetry` | Public can insert epk telemetry | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `equipment_assets` | equipment_assets_modify | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `equipment_assets` | equipment_assets_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `equipment_catalog` | equip_catalog_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `equipment_catalog` | equipment_catalog_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `equipment_catalog` | Users can manage their own equipment | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_catalog` | Users can view equipment catalog | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_instances` | Collaborators can manage equipment instances | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_instances` | equip_instances_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `equipment_instances` | equipment_instances_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `equipment_instances` | Users can view equipment instances for accessible site maps | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_locations` | equip_locations_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `equipment_locations` | equipment_locations_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `equipment_maintenance_log` | equip_maint_owner | `supabase/migrations/20260823210001_equipment_lifecycle.sql` |
| `equipment_power_connections` | Collaborators can manage power connections | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_power_connections` | Users can view power connections for accessible equipment | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_qr_codes` | Users can manage QR codes for accessible equipment | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `equipment_qr_codes` | Users can view QR codes for accessible equipment | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `equipment_reservations` | equipment_reservations_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `equipment_setup_tasks` | Collaborators can manage tasks | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_setup_tasks` | equipment_setup_tasks_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `equipment_setup_tasks` | setup_tasks_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `equipment_setup_tasks` | Users can view tasks for accessible workflows | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_setup_workflows` | Collaborators can manage workflows | `supabase/migrations/20250131000000_site_map_system.sql` |
| `equipment_setup_workflows` | equipment_setup_workflows_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `equipment_setup_workflows` | setup_workflows_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `equipment_setup_workflows` | Users can view workflows for accessible site maps | `supabase/migrations/20250131000000_site_map_system.sql` |
| `event_analytics` | Event owners can view analytics | `supabase/migrations/archive/06_policies_indexes.sql` |
| `event_attendance` | creator_manage_attendance | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| `event_attendance` | user_manage_own_rsvp | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| `event_attendance` | user_read_published_event | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| `event_attendance` | user_update_own_rsvp | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| `event_bulletins` | Authenticated users read own event bulletins | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_bulletins` | event_bulletins_delete | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_bulletins` | event_bulletins_delete_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_bulletins` | event_bulletins_insert | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_bulletins` | event_bulletins_insert_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_bulletins` | event_bulletins_read | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `event_bulletins` | event_bulletins_update | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_bulletins` | event_bulletins_update_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_bulletins` | Service role full access | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_calendar_items` | event_calendar_items_delete | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_calendar_items` | event_calendar_items_delete_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_calendar_items` | event_calendar_items_insert | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_calendar_items` | event_calendar_items_insert_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_calendar_items` | event_calendar_items_read | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_calendar_items` | event_calendar_items_select_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_calendar_items` | event_calendar_items_update | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_collaborators` | event_collaborators_delete | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_collaborators` | event_collaborators_insert | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_collaborators` | event_collaborators_select | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_collaborators` | event_collaborators_update | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_crew_assignments` | Crew members can view their assignments | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `event_crew_assignments` | Venue owners can manage event crew assignments | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `event_documents` | Authenticated users read own event documents | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_documents` | Service role full access | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_group_chats` | Authenticated users read own event group chats | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_group_chats` | Service role full access | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_group_messages` | Authenticated users read group messages | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_group_messages` | Service role full access | `supabase/migrations/20260413210000_event_communications_system.sql` |
| `event_guestlist` | creator_manage_guestlist | `supabase/migrations/20250814091000_event_attendance_guestlist.sql` |
| `event_locations` | event_locations_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `event_package_assets` | event_package_assets_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `event_package_services` | event_package_services_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `event_packages` | event_packages_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `event_page_settings` | event_page_settings_insert | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_page_settings` | event_page_settings_select | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_page_settings` | event_page_settings_update | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `event_participants` | event_participants_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `event_resources` | event_resources_delete | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_resources` | event_resources_delete_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_resources` | event_resources_insert | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_resources` | event_resources_insert_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_resources` | event_resources_read | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_resources` | event_resources_select_managers | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `event_resources` | event_resources_update | `supabase/migrations/20260823221000_event_hq_rls_tighten.sql` |
| `event_secure_uploads` | Authenticated users read own secure uploads | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| `event_secure_uploads` | Service role full access | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| `event_task_messages` | Authenticated users read own task messages | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| `event_task_messages` | Service role full access | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| `event_team_members` | Event owners can manage team | `supabase/migrations/archive/06_policies_indexes.sql` |
| `event_team_members` | Users can view their team memberships | `supabase/migrations/archive/06_policies_indexes.sql` |
| `event_ticketing_config` | event_ticketing_config_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `event_ticketing_config` | event_ticketing_config_write | `supabase/migrations/20260825010000_ticketing_owner_account_resolution.sql` |
| `event_ticketing_grants` | event_ticketing_grants_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `event_ticketing_grants` | event_ticketing_grants_write | `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql` |
| `event_vendor_requests` | event_vendor_requests_select | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `event_vendor_requests` | event_vendor_requests_write | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `event_vendor_requests` | evr_all | `supabase/migrations/20260328150000_event_vendor_requests.sql` |
| `event_zones` | sec104_event_zones_delete | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `event_zones` | sec104_event_zones_insert | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `event_zones` | sec104_event_zones_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `event_zones` | sec104_event_zones_update | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `events` | Anyone can delete events | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `events` | Anyone can insert events | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `events` | Anyone can update events | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `events` | Artists can insert their own events | `supabase/migrations/20260325123000_artist_events_unified_events.sql` |
| `events` | Artists can read own events and public can read published | `supabase/migrations/20260325123000_artist_events_unified_events.sql` |
| `events` | Artists can update their own events | `supabase/migrations/20260325123000_artist_events_unified_events.sql` |
| `events` | Events are viewable by everyone | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `events` | events_read_owner_or_team | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `events` | events_write_owner_only | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `events` | Users can delete their own events | `supabase/migrations/archive/phase2-security-policies.sql` |
| `events` | Users can insert their own events | `supabase/migrations/archive/phase2-security-policies.sql` |
| `events` | Users can manage their own events | `supabase/migrations/archive/06_policies_indexes.sql` |
| `events` | Users can read all events | `supabase/migrations/archive/phase2-security-policies.sql` |
| `events` | Users can update their own events | `supabase/migrations/archive/phase2-security-policies.sql` |
| `events` | Users can view events | `supabase/migrations/archive/06_policies_indexes.sql` |
| `events` | Users can view public events | `supabase/migrations/archive/06_policies_indexes.sql` |
| `events_v2` | events_insert | `supabase/migrations/20250816133000_event_core.sql` |
| `events_v2` | events_select | `supabase/migrations/20250816133000_event_core.sql` |
| `events_v2` | events_update | `supabase/migrations/20250816133000_event_core.sql` |
| `events_v2` | events_v2_tour_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `events_v2` | events_v2_tour_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `events_v2` | events_v2_worker_assignment_select | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `feature_flags` | Admin can manage feature flags | `supabase/migrations/20260604100000_content_moderation.sql` |
| `feature_flags` | post_style_flags_read | `supabase/migrations/20260728224543_harden_post_appearance_v2.sql` |
| `feed_events` | feed_events_delete_own | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `feed_events` | feed_events_insert_own | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `feed_events` | feed_events_select_own | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `feed_events` | feed_events_update_own | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `financial_transactions` | fin_tx_all | `supabase/migrations/20260328140000_financial_tables.sql` |
| `financial_transactions` | fin_tx_org_member | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `flight_coordination` | flight_coordination_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `flight_coordination` | flight_coordination_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `flight_passenger_assignments` | flight_passenger_assignments_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `flight_passenger_assignments` | flight_passenger_assignments_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `follow_requests` | follow_requests_delete | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| `follow_requests` | follow_requests_insert | `supabase/migrations/archive/fix-notifications-safe.sql` |
| `follow_requests` | follow_requests_select | `supabase/migrations/archive/fix-notifications-safe.sql` |
| `follow_requests` | follow_requests_update | `supabase/migrations/archive/fix-notifications-safe.sql` |
| `follow_requests` | Users can create follow requests | `supabase/migrations/20250131000004_friend_suggestions_system.sql` |
| `follow_requests` | Users can delete their own follow requests | `supabase/migrations/20250131000004_friend_suggestions_system.sql` |
| `follow_requests` | Users can update their own follow requests | `supabase/migrations/20250131000004_friend_suggestions_system.sql` |
| `follow_requests` | Users can view their own follow requests | `supabase/migrations/20250131000004_friend_suggestions_system.sql` |
| `follows` | Follows are viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `follows` | follows_delete | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| `follows` | follows_insert | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| `follows` | follows_owner_rw | `supabase/migrations/20250813130000_promotion_core.sql` |
| `follows` | follows_select | `supabase/migrations/20250210000000_complete_follow_friend_system.sql` |
| `follows` | Users can delete their own follows | `supabase/migrations/archive/phase2-security-policies.sql` |
| `follows` | Users can follow others | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `follows` | Users can insert their own follows | `supabase/migrations/archive/phase2-security-policies.sql` |
| `follows` | Users can read all follows | `supabase/migrations/archive/phase2-security-policies.sql` |
| `follows` | Users can unfollow others | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `follows` | Users can update their own follows | `supabase/migrations/archive/phase2-security-policies.sql` |
| `forum_comments` | forum_comments_delete_owner | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_comments` | forum_comments_insert_own | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_comments` | forum_comments_select_all | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_comments` | forum_comments_update_owner | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_kind` | forum_kind_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `forum_moderators` | forum_moderators:manage | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_moderators` | forum_moderators:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_posts` | forum_posts:create | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_posts` | forum_posts:moderate | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_posts` | forum_posts:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_posts` | forum_posts:update_own | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_posts_v2` | posts_v2_create | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_posts_v2` | posts_v2_read | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_posts_v2` | posts_v2_update_own | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_reports` | forum_reports:create | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_reports` | forum_reports:manage_mod | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_reports` | forum_reports:read_mod | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_reports` | forum_reports:read_own | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_subscriptions` | forum_subscriptions_delete_own | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_subscriptions` | forum_subscriptions_insert_own | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_subscriptions` | forum_subscriptions_select_all | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_subscriptions_v2` | forum_subscriptions_v2:manage | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_subscriptions_v2` | subs_v2_manage | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_tags` | forum_tags:manage | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_tags` | forum_tags:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_thread_tags` | forum_thread_tags:manage | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_thread_tags` | forum_thread_tags:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_threads` | forum_threads_delete_owner | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_threads` | forum_threads_insert_own | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_threads` | forum_threads_select_all | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_threads` | forum_threads_update_owner | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_threads_v2` | forum_threads_v2:create | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_threads_v2` | forum_threads_v2:moderate | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_threads_v2` | forum_threads_v2:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_threads_v2` | forum_threads_v2:update_own | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_threads_v2` | threads_v2_create | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_threads_v2` | threads_v2_read | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_threads_v2` | threads_v2_update_own | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forum_votes` | forum_votes_select_all | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_votes` | forum_votes_upsert_own | `supabase/migrations/20250815111000_forums_core.sql` |
| `forum_votes_v2` | forum_votes_v2:manage | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forum_votes_v2` | votes_v2_manage | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forums` | forums_delete_owner | `supabase/migrations/20250815111000_forums_core.sql` |
| `forums` | forums_insert_own | `supabase/migrations/20250815111000_forums_core.sql` |
| `forums` | forums_select_all | `supabase/migrations/20250815111000_forums_core.sql` |
| `forums` | forums_update_owner | `supabase/migrations/20250815111000_forums_core.sql` |
| `forums_v2` | forums_v2_create | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forums_v2` | forums_v2_read | `supabase/migrations/20250816120000_forums_v2_only.sql` |
| `forums_v2` | forums_v2:create | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forums_v2` | forums_v2:read | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `forums_v2` | forums_v2:update | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `geo_external_references` | geo_external_references_public_read | `supabase/migrations/20260822021738_world_shared_geography_foundation.sql` |
| `geo_place_aliases` | geo_place_aliases_public_read | `supabase/migrations/20260822021738_world_shared_geography_foundation.sql` |
| `geo_places` | geo_places_public_read | `supabase/migrations/20260822021738_world_shared_geography_foundation.sql` |
| `glamping_tents` | Collaborators can manage tents | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `glamping_tents` | Users can view tents for accessible site maps | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `ground_transportation_coordination` | ground_transportation_coordination_org_scope_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `ground_transportation_coordination` | ground_transportation_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `ground_transportation_coordination` | ground_transportation_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `group_messages` | group_messages_insert_members | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `group_messages` | group_messages_select_members | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `group_threads` | group_threads_insert_creator | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `group_threads` | group_threads_select_members | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `group_threads` | group_threads_update_admin | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `hashtags` | Anyone can create hashtags | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `hashtags` | Authenticated users can create hashtags | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `hashtags` | Hashtags are viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `hiring_audit_events` | hiring_audit_events_insert | `supabase/migrations/20260330120000_hiring_audit_events.sql` |
| `hiring_audit_events` | hiring_audit_events_read | `supabase/migrations/20260330120000_hiring_audit_events.sql` |
| `hiring_eligibility_snapshots` | hiring_eligibility_snapshots_insert | `supabase/migrations/20260409183000_hiring_eligibility_gate.sql` |
| `hiring_eligibility_snapshots` | hiring_eligibility_snapshots_read | `supabase/migrations/20260409183000_hiring_eligibility_gate.sql` |
| `holds` | holds_delete | `supabase/migrations/20250816133000_event_core.sql` |
| `holds` | holds_insert | `supabase/migrations/20250816133000_event_core.sql` |
| `holds` | holds_select | `supabase/migrations/20250816133000_event_core.sql` |
| `holds` | holds_update | `supabase/migrations/20250816133000_event_core.sql` |
| `hotel_room_assignments` | hotel_room_assignments_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `hotel_room_assignments` | hotel_room_assignments_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `incidents` | incidents_cud | `supabase/migrations/20250816140000_incidents.sql` |
| `incidents` | incidents_select | `supabase/migrations/20250816140000_incidents.sql` |
| `integration_audit_log` | integration_audit_owner_read | `supabase/migrations/20260825040000_integrations_manage_and_audit.sql` |
| `job_applications` | insert_job_apps | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `job_applications` | job_applications_applicant_insert_own | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `job_applications` | job_applications_applicant_read_own | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `job_applications` | job_applications_applicant_update_own | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `job_applications` | job_applications_select | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `job_applications` | job_applications_write | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `job_applications` | read_all_job_apps | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `job_applications` | update_job_apps | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `job_posting_templates` | insert_job_postings | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `job_posting_templates` | job_posting_templates_public_published_read | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `job_posting_templates` | job_posting_templates_select | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `job_posting_templates` | job_posting_templates_write | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `job_posting_templates` | public_read_published_job_posting_templates | `supabase/migrations/20260714000825_allow_public_read_open_jobs.sql` |
| `job_posting_templates` | read_all_job_postings | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `job_posting_templates` | update_job_postings | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `likes` | Users can delete their own likes | `supabase/migrations/archive/phase2-security-policies.sql` |
| `likes` | Users can insert their own likes | `supabase/migrations/archive/phase2-security-policies.sql` |
| `likes` | Users can read all likes | `supabase/migrations/archive/phase2-security-policies.sql` |
| `likes` | Users can update their own likes | `supabase/migrations/archive/phase2-security-policies.sql` |
| `locations` | locations_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `lodging_availability` | lodging_availability_manage | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `lodging_availability` | lodging_availability_select | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `lodging_bookings` | lodging_bookings_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_bookings` | lodging_bookings_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_calendar_events` | lodging_calendar_events_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_calendar_events` | lodging_calendar_events_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_guest_assignments` | lodging_guest_assignments_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_guest_assignments` | lodging_guest_assignments_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_payments` | lodging_payments_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_payments` | lodging_payments_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `lodging_providers` | lodging_providers_manage | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `lodging_providers` | lodging_providers_select | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `lodging_providers` | lodging_providers_select_authenticated | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `lodging_room_types` | lodging_room_types_manage | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `lodging_room_types` | lodging_room_types_select | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `logistics_acknowledgements` | logistics_acks_insert_authenticated | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `logistics_acknowledgements` | logistics_acks_select_own_or_admin | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `logistics_acknowledgements` | logistics_acks_update_own | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `logistics_activity` | admin_logistics_activity_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_activity` | admin_logistics_activity_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_activity` | log_act_insert_linked_task | `supabase/migrations/20250813104500_logistics_activity.sql` |
| `logistics_activity` | log_act_read_linked_task | `supabase/migrations/20250813104500_logistics_activity.sql` |
| `logistics_comms_channels` | comms_channels_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `logistics_comms_plans` | comms_plans_authenticated_all | `supabase/migrations/20260908100000_reconcile_archived_logistics_foundation.sql` |
| `logistics_task_equipment` | admin_logistics_equipment_mutate | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_task_equipment` | admin_logistics_equipment_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_task_equipment` | log_task_equipment_cud_rbacs | `supabase/migrations/20250813102000_logistics_tasks_rls.sql` |
| `logistics_task_equipment` | log_task_equipment_read_auth | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| `logistics_task_equipment` | log_task_equipment_select_rbacs | `supabase/migrations/20250813102000_logistics_tasks_rls.sql` |
| `logistics_task_equipment` | log_task_equipment_write_auth | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| `logistics_tasks` | admin_logistics_tasks_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_tasks` | admin_logistics_tasks_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_tasks` | admin_logistics_tasks_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_tasks` | admin_logistics_tasks_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `logistics_tasks` | log_tasks_delete_rbacs | `supabase/migrations/20250813102000_logistics_tasks_rls.sql` |
| `logistics_tasks` | log_tasks_insert_rbacs | `supabase/migrations/20250813102000_logistics_tasks_rls.sql` |
| `logistics_tasks` | log_tasks_read_all_auth | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| `logistics_tasks` | log_tasks_select_rbacs | `supabase/migrations/20250813102000_logistics_tasks_rls.sql` |
| `logistics_tasks` | log_tasks_update_rbacs | `supabase/migrations/20250813102000_logistics_tasks_rls.sql` |
| `logistics_tasks` | log_tasks_write_creator_or_admin | `supabase/migrations/20250813094500_logistics_tasks.sql` |
| `map_issues` | Users can manage issues for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_issues` | Users can view issues for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_layers` | Users can manage layers for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_layers` | Users can view layers for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_measurements` | Users can manage measurements for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_measurements` | Users can view measurements for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_task_assignments` | Users can manage task assignments for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_task_assignments` | Users can view task assignments for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_templates` | Users can manage their own templates | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_templates` | Users can view public templates | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_versions` | Users can manage versions for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `map_versions` | Users can view versions for accessible site maps | `supabase/migrations/20250131000002_enhanced_site_map_features.sql` |
| `marketplace_entitlements` | marketplace_entitlements_buyer_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_entitlements` | marketplace_entitlements_seller_manage | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_integrations` | marketplace_integrations_owner_manage | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_listing_variants` | marketplace_variants_owner_manage | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_listing_variants` | marketplace_variants_public_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_listings` | marketplace_listings_owner_manage | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_listings` | marketplace_listings_public_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_order_items` | marketplace_order_items_buyer_create | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_order_items` | marketplace_order_items_participant_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_orders` | marketplace_orders_buyer_create | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_orders` | marketplace_orders_participant_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_orders` | marketplace_orders_seller_update | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_payout_ledger` | marketplace_payout_seller_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_service_milestones` | marketplace_service_items_participant | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_service_milestones` | marketplace_service_items_seller_manage | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_storefronts` | marketplace_storefronts_owner_manage | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `marketplace_storefronts` | marketplace_storefronts_public_read | `supabase/migrations/20260410120000_marketplace_core.sql` |
| `messages` | messages_insert_sender_participant | `supabase/migrations/20260823160000_messaging_isolation.sql` |
| `messages` | messages_update_author_only | `supabase/migrations/20260823160000_messaging_isolation.sql` |
| `messages` | Users can send messages | `supabase/migrations/archive/quick_messaging_fix_corrected.sql` |
| `messages` | Users can update their messages | `supabase/migrations/archive/manual_fix_messaging_schema.sql` |
| `messages` | Users can update their own messages | `supabase/migrations/archive/create-music-tables.sql` |
| `messages` | Users can view messages they sent or received | `supabase/migrations/archive/ensure-music-tables.sql` |
| `messages` | Users can view their messages | `supabase/migrations/archive/quick_messaging_fix_corrected.sql` |
| `music` | Users can comment | `supabase/migrations/20250115000000_artist_music_system.sql` |
| `music_comments` | Anyone can view music comments | `supabase/migrations/archive/ensure-music-tables.sql` |
| `music_comments` | Users can delete their own comments | `supabase/migrations/20250115000000_artist_music_system.sql` |
| `music_comments` | Users can manage their own comments | `supabase/migrations/archive/ensure-music-tables.sql` |
| `music_comments` | Users can update their own comments | `supabase/migrations/20250115000000_artist_music_system.sql` |
| `music_engagement_events` | music_events_artist_or_actor_read | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `music_engagement_events` | music_events_insert_anyone | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `music_likes` | Anyone can view music likes | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `music_likes` | Users can like music | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `music_likes` | Users can unlike their own likes | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `music_playlist_items` | music_playlist_items_owner_manage | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `music_playlist_items` | music_playlist_items_owner_or_public_read | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `music_playlist_shares` | music_playlist_shares_owner_create | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `music_playlist_shares` | music_playlist_shares_owner_read | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `music_playlists` | music_playlists_owner_manage | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `music_playlists` | music_playlists_public_read | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `music_plays` | Anyone can view music plays | `supabase/migrations/archive/ensure-music-tables.sql` |
| `music_plays` | music_plays_artist_or_listener_read | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `music_plays` | music_plays_insert_anyone | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `music_plays` | Users can manage their own plays | `supabase/migrations/archive/ensure-music-tables.sql` |
| `music_preview_generation_jobs` | Artists can read own preview jobs | `supabase/migrations/20260711173622_music_preview_jobs.sql` |
| `music_shares` | Anyone can view music shares | `supabase/migrations/archive/ensure-music-tables.sql` |
| `music_shares` | Users can manage their own shares | `supabase/migrations/archive/ensure-music-tables.sql` |
| `notification_delivery_log` | notification_delivery_log_insert_service | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| `notification_delivery_log` | notification_delivery_log_select_own | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| `notification_events` | notification_events_insert_service | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `notification_events` | notification_events_select_own | `supabase/migrations/20260413110000_notification_events_table.sql` |
| `notification_preferences` | notification_preferences_own | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `notifications` | notif_read_own | `supabase/migrations/20250818121500_notifications_and_staff_messages.sql` |
| `notifications` | notif_write_own | `supabase/migrations/20250818121500_notifications_and_staff_messages.sql` |
| `notifications` | notifications_delete | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `notifications` | notifications_insert | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| `notifications` | notifications_select | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `notifications` | notifications_update | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `notifications` | Users can create venue notifications | `supabase/migrations/archive/apply_workflow_migration.sql` |
| `notifications` | Users can delete their own notifications | `supabase/migrations/archive/phase2-security-policies.sql` |
| `notifications` | Users can insert their own notifications | `supabase/migrations/archive/phase2-security-policies.sql` |
| `notifications` | Users can manage their own notifications | `supabase/migrations/archive/critical_missing_tables.sql` |
| `notifications` | Users can read their own notifications | `supabase/migrations/archive/phase2-security-policies.sql` |
| `notifications` | Users can update their notifications | `supabase/migrations/archive/apply_workflow_migration.sql` |
| `notifications` | Users can update their own notifications | `supabase/migrations/archive/phase2-security-policies.sql` |
| `notifications` | Users can view their notifications | `supabase/migrations/archive/apply_workflow_migration.sql` |
| `notifications_v2` | notifications_v2:manage | `supabase/migrations/20250815120000_forums_production_schema.sql` |
| `offers` | offers_cud | `supabase/migrations/20250816135000_offers_contracts.sql` |
| `offers` | offers_select | `supabase/migrations/20250816135000_offers_contracts.sql` |
| `onboarding` | Service role can manage onboarding | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `onboarding` | Users can insert their own onboarding | `supabase/migrations/archive/emergency-auth-fix.sql` |
| `onboarding` | Users can manage own onboarding | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `onboarding` | Users can manage their own onboarding | `supabase/migrations/archive/simple_auth_fix.sql` |
| `onboarding` | Users can update their own onboarding | `supabase/migrations/archive/emergency-auth-fix.sql` |
| `onboarding` | Users can view their own onboarding | `supabase/migrations/archive/simple_auth_fix.sql` |
| `onboarding_flows` | onboarding_flows_own | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `onboarding_responses` | onboarding_responses_employer_manage | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `onboarding_responses` | onboarding_responses_own_read | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `onboarding_steps` | insert_steps | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `onboarding_steps` | read_all_steps | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `onboarding_steps` | update_steps | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `onboarding_templates` | onboarding_templates_read | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `onboarding_workflows` | insert_workflows | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `onboarding_workflows` | read_all_workflows | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `onboarding_workflows` | update_workflows | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `onboarding_workflows` | Users can create venue workflows | `supabase/migrations/archive/apply_workflow_migration.sql` |
| `onboarding_workflows` | Users can update venue workflows | `supabase/migrations/archive/apply_workflow_migration.sql` |
| `onboarding_workflows` | Users can view venue workflows | `supabase/migrations/archive/apply_workflow_migration.sql` |
| `opportunities` | opportunities_read_public | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| `opportunities` | opportunities_write_authenticated | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| `org_invites` | invites_insert | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_invites` | invites_select | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_invites` | invites_update | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_invites` | org_invites_accept_recipient | `supabase/migrations/20260909195618_atomic_org_invites.sql` |
| `org_invites` | org_invites_select_members_or_invitee | `supabase/migrations/20260711182530_organization_personas_integration.sql` |
| `org_members` | members_delete | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_members` | members_insert | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_members` | members_select | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_members` | members_update | `supabase/migrations/20250816132000_org_rbac.sql` |
| `org_members` | org_members_accept_invite | `supabase/migrations/20260909195618_atomic_org_invites.sql` |
| `org_role_permissions` | roleperms_select | `supabase/migrations/20250816132000_org_rbac.sql` |
| `organization_artist_members` | organization_artist_members_artist_select | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| `organization_artist_members` | organization_artist_members_artist_update | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| `organization_artist_members` | organization_artist_members_org_manage | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| `organization_artist_members` | organization_artist_members_public_select | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| `organization_social_integrations` | org_social_integrations_delete | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_integrations` | org_social_integrations_insert | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_integrations` | org_social_integrations_select | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_integrations` | org_social_integrations_update | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_media_insights` | org_social_media_insights_delete | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_media_insights` | org_social_media_insights_insert | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_media_insights` | org_social_media_insights_select | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organization_social_media_insights` | org_social_media_insights_update | `supabase/migrations/20260720070144_organization_social_integrations_content_hub.sql` |
| `organizations` | organizations_worker_assignment_select | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `organizations` | orgs_insert | `supabase/migrations/20250816132000_org_rbac.sql` |
| `organizations` | orgs_select | `supabase/migrations/20250816132000_org_rbac.sql` |
| `organizations` | orgs_update | `supabase/migrations/20250816132000_org_rbac.sql` |
| `organizer_accounts` | organizer_accounts_owner_manage | `supabase/migrations/20260604100000_content_moderation.sql` |
| `organizer_accounts` | organizer_accounts_public_select | `supabase/migrations/20260712005429_organization_public_personas.sql` |
| `organizer_accounts` | organizer_accounts_tour_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `organizer_pages` | organizer_owner_rw | `supabase/migrations/20250813130000_promotion_core.sql` |
| `organizer_pages` | organizer_public_read | `supabase/migrations/20250813130000_promotion_core.sql` |
| `performance_agencies` | agencies_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `photo_albums` | Public albums are viewable by everyone | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_albums` | Users can create their own albums | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_albums` | Users can delete their own albums | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_albums` | Users can update their own albums | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_albums` | Users can view their own albums | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_comments` | Comments are viewable if photo is viewable | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_comments` | Users can delete their own comments | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_comments` | Users can update their own comments | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_likes` | Anyone can view photo likes | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_likes` | Authenticated users can like photos | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_likes` | Users can unlike photos they liked | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_purchases` | Sellers can view sales of their photos | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_purchases` | Users can create purchases | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_purchases` | Users can view their purchases | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_tags` | Authenticated users can create tags | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_tags` | Tags are viewable if photo is viewable | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photo_tags` | Users can delete tags they created | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Authenticated users can comment | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Buyers can view photos they purchased | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Public photos are viewable by everyone | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Users can create their own photos | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Users can delete their own photos | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Users can update their own photos | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `photos` | Users can view their own photos | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `portfolio_items` | Manage own portfolio | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `portfolio_items` | Read public portfolio | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `post_appearance_revisions` | post_appearance_revisions_insert_own | `supabase/migrations/20260728001002_post_appearance_revisions.sql` |
| `post_appearance_revisions` | post_appearance_revisions_select_own | `supabase/migrations/20260728001002_post_appearance_revisions.sql` |
| `post_appearances` | post_appearances_insert_own | `supabase/migrations/20260728001001_post_appearances.sql` |
| `post_appearances` | post_appearances_select_public | `supabase/migrations/20260728001001_post_appearances.sql` |
| `post_appearances` | post_appearances_select_visible_parent | `supabase/migrations/20260728224543_harden_post_appearance_v2.sql` |
| `post_appearances` | post_appearances_update_own | `supabase/migrations/20260728001001_post_appearances.sql` |
| `post_collaborators` | post_collab_read | `supabase/migrations/20250813130000_promotion_core.sql` |
| `post_collaborators` | post_collab_write_author | `supabase/migrations/20250813130000_promotion_core.sql` |
| `post_comments` | Comments are viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_comments` | post_comments_delete | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_comments` | post_comments_delete_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_comments` | post_comments_insert | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_comments` | post_comments_insert_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_comments` | post_comments_select | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_comments` | post_comments_select_visible | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_comments` | post_comments_update | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_comments` | post_comments_update_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_comments` | Users can create comments | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_comments` | Users can delete their own comments | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_comments` | Users can update their own comments | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_hashtags` | Post hashtags are viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_hashtags` | Users can tag posts with hashtags | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_kind` | post_kind_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `post_likes` | Anyone can view likes | `supabase/migrations/archive/fix_posts_schema.sql` |
| `post_likes` | post_likes_delete | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_likes` | post_likes_delete_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_likes` | post_likes_insert | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_likes` | post_likes_insert_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_likes` | post_likes_select | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_likes` | post_likes_select_visible | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_likes` | Users can like posts | `supabase/migrations/archive/fix_posts_schema.sql` |
| `post_likes` | Users can unlike posts | `supabase/migrations/archive/fix_posts_schema.sql` |
| `post_media` | Post media is viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_media` | Users can manage media for their posts | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_shares` | post_shares_delete | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_shares` | post_shares_delete_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_shares` | post_shares_insert | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_shares` | post_shares_insert_own | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_shares` | post_shares_select | `supabase/migrations/20250210000001_comprehensive_notification_system.sql` |
| `post_shares` | post_shares_select_visible | `supabase/migrations/20260728233640_repair_post_engagement_persistence.sql` |
| `post_shares` | Users can share posts | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_shares` | Users can view their own shares | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `post_style_profiles` | post_style_profiles_delete_own | `supabase/migrations/20260728001000_post_style_profiles.sql` |
| `post_style_profiles` | post_style_profiles_insert_own | `supabase/migrations/20260728001000_post_style_profiles.sql` |
| `post_style_profiles` | post_style_profiles_select_own | `supabase/migrations/20260728001000_post_style_profiles.sql` |
| `post_style_profiles` | post_style_profiles_update_own | `supabase/migrations/20260728001000_post_style_profiles.sql` |
| `posts` | Anyone can view posts | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `posts` | Anyone can view public posts | `supabase/migrations/archive/fix_posts_schema.sql` |
| `posts` | Posts are viewable by everyone | `supabase/migrations/archive/complete_migration.sql` |
| `posts` | Public can view published posts | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `posts` | Users can create posts attributed to owned entities | `supabase/migrations/20260711182530_organization_personas_integration.sql` |
| `posts` | Users can create their own posts | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `posts` | Users can delete posts through their accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `posts` | Users can delete their own posts | `supabase/migrations/archive/phase2-security-policies.sql` |
| `posts` | Users can insert posts through their accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `posts` | Users can insert their own posts | `supabase/migrations/archive/phase2-security-policies.sql` |
| `posts` | Users can manage their own posts | `supabase/migrations/archive/ensure-music-tables.sql` |
| `posts` | Users can read all posts | `supabase/migrations/archive/phase2-security-policies.sql` |
| `posts` | Users can update posts through their accounts | `supabase/migrations/archive/COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql` |
| `posts` | Users can update their own posts | `supabase/migrations/archive/phase2-security-policies.sql` |
| `posts` | Users can view all posts | `supabase/migrations/archive/complete_database_setup.sql` |
| `posts` | Users can view their own posts | `supabase/migrations/archive/create-music-tables.sql` |
| `power_distribution` | Collaborators can manage power distribution | `supabase/migrations/20250131000000_site_map_system.sql` |
| `power_distribution` | Users can view power distribution for accessible site maps | `supabase/migrations/20250131000000_site_map_system.sql` |
| `production_companies` | production_companies_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `profile_certifications` | Manage own certifications | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `profile_certifications` | Read public certifications | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `profile_experiences` | Manage own experiences | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `profile_experiences` | Read visible experiences | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `profiles` | Profiles are viewable by everyone | `supabase/migrations/20241220000010_enhance_feed_system.sql` |
| `profiles` | profiles_select | `supabase/migrations/20250211000000_production_schema_optimization.sql` |
| `profiles` | profiles_update | `supabase/migrations/20250211000000_production_schema_optimization.sql` |
| `profiles` | Public profiles are viewable by everyone | `supabase/migrations/archive/fix-database-schema-mismatch.sql` |
| `profiles` | Service role can manage profiles | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `profiles` | Users can delete their own profile | `supabase/migrations/archive/phase2-security-policies.sql` |
| `profiles` | Users can insert own profile | `supabase/migrations/20250816131000_profiles_trigger_policies.sql` |
| `profiles` | Users can insert their own profile | `supabase/migrations/archive/simple_auth_fix.sql` |
| `profiles` | Users can read all profiles | `supabase/migrations/archive/phase2-security-policies.sql` |
| `profiles` | Users can update own profile | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `profiles` | Users can update their own profile | `supabase/migrations/archive/simple_auth_fix.sql` |
| `profiles` | Users can view all profiles | `supabase/migrations/archive/simple_auth_fix.sql` |
| `profiles` | Users can view own profile | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `profiles` | Users can view their own profile | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `project_activity` | Users can create activity records | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_activity` | Users can view project activity | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_collaborators` | Users can update their own collaborator record | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_collaborators` | Users can view project collaborators | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_collaborators` | Users with permissions can add collaborators | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_files` | File uploaders and admins can update files | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_files` | Users can view project files | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_files` | Users with permissions can upload files | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_tasks` | Authorized users can update tasks | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_tasks` | Users can view project tasks | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `project_tasks` | Users with permissions can create tasks | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `promo_codes` | promo_codes_all | `supabase/migrations/20260328130000_ticketing_v2.sql` |
| `promoters` | promoters_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `promotion_posts` | promotion_author_rw | `supabase/migrations/20250813130000_promotion_core.sql` |
| `promotion_posts` | promotion_public_read | `supabase/migrations/20250813130000_promotion_core.sql` |
| `public` | _lint0008_service_role_all | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `public` | %I | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `rbac_permission_audit_log` | rbac_audit_insert_authenticated | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_permission_audit_log` | rbac_audit_select_admin | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_permissions` | _lint0008_rbac_permissions_read | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_permissions` | _lint0008_service_role_all | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_permissions` | rbac_permissions_read_authenticated | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_role_permissions` | _lint0008_rbac_role_permissions_read | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_role_permissions` | _lint0008_service_role_all | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_role_permissions` | rbac_role_permissions_read_authenticated | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_roles` | _lint0008_rbac_roles_read | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_roles` | _lint0008_service_role_all | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_roles` | rbac_roles_read_authenticated | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_user_entity_roles` | _lint0008_rbac_user_entity_roles_own | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_user_entity_roles` | _lint0008_service_role_all | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_user_entity_roles` | rbac_user_entity_roles_manage | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_user_entity_roles` | rbac_user_entity_roles_self_read | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rbac_user_permission_overrides` | _lint0008_rbac_overrides_own | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_user_permission_overrides` | _lint0008_service_role_all | `supabase/migrations/20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql` |
| `rbac_user_permission_overrides` | rbac_overrides_admin_all | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `rental_agreement_items` | rental_agreement_items_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `rental_agreement_items` | rental_agreement_items_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `rental_agreements` | rental_agreements_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `rental_agreements` | rental_agreements_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `rental_clients` | rental_clients_manage | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `rental_clients` | rental_clients_select | `supabase/migrations/20260413200100_logistics_domain_tables.sql` |
| `rental_companies` | rental_companies_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `rental_payments` | rental_payments_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `rental_payments` | rental_payments_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `required_docs` | docs_cud | `supabase/migrations/20250816135000_offers_contracts.sql` |
| `required_docs` | docs_select | `supabase/migrations/20250816135000_offers_contracts.sql` |
| `resume_achievement_highlights` | resume_highlights_select_own | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| `resume_achievement_highlights` | resume_highlights_write_own | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| `reward_transactions` | reward_transactions_select_own | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| `reward_transactions` | reward_transactions_write_own | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| `schedule_items` | scheditems_insert | `supabase/migrations/20250816134600_tasks_schedule_rls_fix.sql` |
| `schedule_items` | scheditems_select | `supabase/migrations/20250816134600_tasks_schedule_rls_fix.sql` |
| `scheduled_posts` | scheduled_posts_own | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `schedules` | schedules_insert | `supabase/migrations/20250816134600_tasks_schedule_rls_fix.sql` |
| `schedules` | schedules_select | `supabase/migrations/20250816134600_tasks_schedule_rls_fix.sql` |
| `secure_audit_log` | Event owners read audit log | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| `secure_audit_log` | Service role full access | `supabase/migrations/20260413220000_event_task_messages_secure_uploads.sql` |
| `signatures` | sigs_cud | `supabase/migrations/20250816135000_offers_contracts.sql` |
| `signatures` | sigs_select | `supabase/migrations/20250816135000_offers_contracts.sql` |
| `site_map_activity_log` | sec104_site_map_activity_insert | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| `site_map_activity_log` | sec104_site_map_activity_select | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| `site_map_activity_log` | Users can log activity for their site maps | `supabase/migrations/archive/fix-site-map-rls-policies.sql` |
| `site_map_activity_log` | Users can view activity for accessible site maps | `supabase/migrations/20250131000000_site_map_system.sql` |
| `site_map_activity_log` | Users can view activity log for accessible site maps | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_map_collaborators` | Collaborators can manage collaborators | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_map_collaborators` | Owners and editors can manage collaborators | `supabase/migrations/20260710193033_site_map_rls_no_recursion.sql` |
| `site_map_collaborators` | Site map owners can manage collaborators | `supabase/migrations/20250131000000_site_map_system.sql` |
| `site_map_collaborators` | Users can view collaborators for accessible site maps | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_map_collaborators` | Users can view collaborators for their site maps | `supabase/migrations/20260710193033_site_map_rls_no_recursion.sql` |
| `site_map_elements` | Collaborators can manage elements | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_map_elements` | sec104_site_map_elements_delete | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| `site_map_elements` | sec104_site_map_elements_insert | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| `site_map_elements` | sec104_site_map_elements_select | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| `site_map_elements` | sec104_site_map_elements_update | `supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql` |
| `site_map_elements` | Users can view elements for accessible site maps | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_map_zones` | Collaborators can manage zones | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_map_zones` | sec104_site_map_zones_delete | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_map_zones` | sec104_site_map_zones_insert | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_map_zones` | sec104_site_map_zones_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_map_zones` | sec104_site_map_zones_update | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_map_zones` | Users can view zones for accessible site maps | `supabase/migrations/20250131000001_fix_site_map_policies.sql` |
| `site_maps` | Collaborators can view site maps | `supabase/migrations/archive/fix-site-map-rls-policies.sql` |
| `site_maps` | sec104_site_maps_collaborator_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | sec104_site_maps_delete | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | sec104_site_maps_insert | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | sec104_site_maps_logistics_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | sec104_site_maps_owner_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | sec104_site_maps_public_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | sec104_site_maps_update | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `site_maps` | site_maps_operator_read | `supabase/migrations/20260823220000_site_map_bridge.sql` |
| `site_maps` | site_maps_operator_write | `supabase/migrations/20260823220000_site_map_bridge.sql` |
| `site_maps` | Users can manage their own site maps | `supabase/migrations/archive/fix-site-map-rls-policies.sql` |
| `site_maps` | Users can view public site maps | `supabase/migrations/archive/fix-site-map-rls-policies.sql` |
| `skill_endorsements` | Create own endorsement | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `skill_endorsements` | Delete own endorsement | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `skill_endorsements` | Read endorsements | `supabase/migrations/20250819102000_profile_content_core.sql` |
| `social_media_performance` | social_media_performance_org_read | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| `staff_applications` | Job posters can view applications | `supabase/migrations/archive/06_policies_indexes.sql` |
| `staff_applications` | Users can manage their own applications | `supabase/migrations/archive/critical_missing_tables.sql` |
| `staff_certifications` | staff_certifications_select | `supabase/migrations/20250812093500_entity_rls_policies_more.sql` |
| `staff_certifications` | staff_certifications_write | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_contracts` | staff_contracts_auth | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `staff_contracts` | staff_contracts_delete | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_contracts` | staff_contracts_insert | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_contracts` | staff_contracts_select | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_contracts` | staff_contracts_update | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_documents` | staff_documents_insert_by_employer | `supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql` |
| `staff_documents` | staff_documents_insert_own | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| `staff_documents` | staff_documents_select_by_employer | `supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql` |
| `staff_documents` | staff_documents_select_own | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| `staff_documents` | staff_documents_update_by_employer | `supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql` |
| `staff_documents` | staff_documents_update_own | `supabase/migrations/20260409120000_job_views_staff_docs_agreements.sql` |
| `staff_invitations` | staff_invitations_tour_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `staff_invitations` | staff_invitations_tour_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `staff_invitations` | staff_invitations_tour_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `staff_invitations` | staff_invitations_tour_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `staff_jobs` | Job posters can manage their jobs | `supabase/migrations/archive/critical_missing_tables.sql` |
| `staff_jobs` | Users can view all jobs | `supabase/migrations/archive/critical_missing_tables.sql` |
| `staff_jobs` | Users can view and apply to jobs | `supabase/migrations/archive/06_policies_indexes.sql` |
| `staff_member_skills` | Anyone can view verified skills | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `staff_member_skills` | Users can manage their own skills | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `staff_members` | insert_staff | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_members` | read_all_staff | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_members` | staff_members_worker_read_own | `supabase/migrations/20260625000000_polymorphic_hiring_entity.sql` |
| `staff_members` | update_staff | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_messages` | staff_messages_all | `supabase/migrations/20250818121500_notifications_and_staff_messages.sql` |
| `staff_messages` | staff_messages_delete | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_messages` | staff_messages_insert | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_messages` | staff_messages_select | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_messages` | staff_messages_update | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding` | staff_onboarding_own | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `staff_onboarding_candidates` | insert_candidates | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_onboarding_candidates` | read_all_candidates | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_onboarding_candidates` | staff_onboarding_candidates_worker_read_own | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `staff_onboarding_candidates` | update_candidates | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_onboarding_sensitive_vault` | staff_onboarding_sensitive_vault_pii_admin | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `staff_onboarding_sensitive_vault` | staff_onboarding_sensitive_vault_service | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `staff_onboarding_steps` | staff_onboarding_steps_auth | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `staff_onboarding_steps` | staff_onboarding_steps_delete | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_steps` | staff_onboarding_steps_insert | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_steps` | staff_onboarding_steps_select | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_steps` | staff_onboarding_steps_update | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_auth | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_delete | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_employer_select | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_employer_write | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_global_select | `supabase/migrations/20260823210000_harden_hiring_onboarding_pii.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_insert | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_select | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_onboarding_templates` | staff_onboarding_templates_update | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_performance_metrics` | insert_metrics | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_performance_metrics` | read_all_metrics | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_performance_metrics` | staff_performance_metrics_select | `supabase/migrations/20250812093500_entity_rls_policies_more.sql` |
| `staff_performance_metrics` | staff_performance_metrics_write | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_performance_metrics` | update_metrics | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_reviews` | Anyone can view staff reviews | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `staff_reviews` | Venue owners can create reviews for their staff | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `staff_schedules` | staff_schedules_auth | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `staff_shift_assignments` | staff_shift_assignments_employer_manage_hiring | `supabase/migrations/20260714015225_hiring_hub_roster_management_compat.sql` |
| `staff_shifts` | insert_shifts | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_shifts` | read_all_shifts | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_shifts` | staff_shifts_scoped_delete | `supabase/migrations/20260821031214_repair_event_tour_staffing_flow.sql` |
| `staff_shifts` | staff_shifts_scoped_insert | `supabase/migrations/20260821031214_repair_event_tour_staffing_flow.sql` |
| `staff_shifts` | staff_shifts_scoped_read | `supabase/migrations/20260821031214_repair_event_tour_staffing_flow.sql` |
| `staff_shifts` | staff_shifts_scoped_update | `supabase/migrations/20260821031214_repair_event_tour_staffing_flow.sql` |
| `staff_shifts` | staff_shifts_select | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `staff_shifts` | staff_shifts_write | `supabase/migrations/20250812093000_entity_rls_policies.sql` |
| `staff_shifts` | update_shifts | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_training_records` | staff_training_records_select | `supabase/migrations/20250812093500_entity_rls_policies_more.sql` |
| `staff_training_records` | staff_training_records_write | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_zones` | insert_zones | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_zones` | read_all_zones | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staff_zones` | sec104_staff_zones_delete | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `staff_zones` | sec104_staff_zones_insert | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `staff_zones` | sec104_staff_zones_select | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `staff_zones` | sec104_staff_zones_update | `supabase/migrations/20260903120000_site_map_zone_security_and_canonical_bridge.sql` |
| `staff_zones` | staff_zones_select | `supabase/migrations/20250812093500_entity_rls_policies_more.sql` |
| `staff_zones` | staff_zones_write | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `staff_zones` | update_zones | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `staffing_agencies` | staffing_agencies_select | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `staffing_agency_staff` | staffing_agency_staff_rw | `supabase/migrations/20250812091000_entity_rls_policies.sql` |
| `staffing_alert_events` | staffing_alert_events_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `staffing_api_telemetry` | staffing_api_telemetry_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `staffing_overview_cache` | staffing_overview_cache_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `storage` | Anyone can view artist photos | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | application_documents_insert_own | `supabase/migrations/20260701021033_job_application_profile_snapshot.sql` |
| `storage` | application_documents_public_read | `supabase/migrations/20260701021033_job_application_profile_snapshot.sql` |
| `storage` | application_documents_select_own | `supabase/migrations/20260717194541_harden_security_audit_remediation.sql` |
| `storage` | artist-documents: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-documents: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-documents: owner read | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-documents: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-documents: service_role all | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-merchandise: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-merchandise: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-merchandise: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-merchandise: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | artist-videos: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-videos: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-videos: owner read | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-videos: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | artist-videos: service_role all | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | Authenticated users can upload post media | `supabase/migrations/archive/FIX_STORAGE_BUCKETS.sql` |
| `storage` | avatars: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | avatars: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | avatars: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | avatars: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | documents: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | documents: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | documents: owner read | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | documents: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | documents: service_role all | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | event-media: authenticated insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | event-media: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | event-media: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | event-media: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | msg_attach_owner_delete | `supabase/migrations/20260825130000_phase3_message_attachments_bucket_private.sql` |
| `storage` | msg_attach_owner_insert | `supabase/migrations/20260825130000_phase3_message_attachments_bucket_private.sql` |
| `storage` | msg_attach_owner_read | `supabase/migrations/20260825130000_phase3_message_attachments_bucket_private.sql` |
| `storage` | operations logistics delete | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `storage` | operations logistics read | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `storage` | operations logistics update | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `storage` | operations logistics upload | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `storage` | photos-preview: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | photos-thumbnail: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | photos-watermarked: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | portfolio: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | portfolio: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | portfolio: owner read | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | portfolio: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | Post media images are publicly accessible | `supabase/migrations/archive/FIX_STORAGE_BUCKETS.sql` |
| `storage` | post-media: authenticated insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | post-media: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | post-media: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | post-media: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | posts: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | private-docs-delete | `supabase/migrations/20250816141000_storage_private_docs.sql` |
| `storage` | private-docs-insert | `supabase/migrations/20250816141000_storage_private_docs.sql` |
| `storage` | private-docs-insert-svc | `supabase/migrations/20250816141000_storage_private_docs.sql` |
| `storage` | private-docs-update | `supabase/migrations/20250816141000_storage_private_docs.sql` |
| `storage` | profiles: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `storage` | Project collaborators can upload files | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `storage` | Project collaborators can view files | `supabase/migrations/20250122000000_project_workspaces_phase1.sql` |
| `storage` | staff_onboarding_storage_authenticated_write | `supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql` |
| `storage` | Users can delete own music files | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can delete own photos | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can delete their own music files | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can delete their own photos | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can delete their own post media | `supabase/migrations/archive/FIX_STORAGE_BUCKETS.sql` |
| `storage` | Users can update own music files | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can update own photos | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can update their own music files | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can update their own photos | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can update their own post media | `supabase/migrations/archive/FIX_STORAGE_BUCKETS.sql` |
| `storage` | Users can upload music to own folder | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can upload own music files | `supabase/migrations/20260413300002_tighten_music_storage_policies.sql` |
| `storage` | Users can upload photos to own folder | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can upload their own music files | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can upload their own photos | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can view own music files | `supabase/migrations/archive/fix_artist_music_upload.sql` |
| `storage` | Users can view public music files | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | Users can view public photos | `supabase/migrations/archive/fix-storage-permissions.sql` |
| `storage` | venue-documents: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-documents: owner insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-documents: owner read | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-documents: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-documents: service_role all | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-media: authenticated insert | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-media: owner delete | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-media: owner update | `supabase/migrations/20260413000000_comprehensive_storage_setup.sql` |
| `storage` | venue-media: public read | `supabase/migrations/20260414130000_security_linter_step4_storage_public_read.sql` |
| `subscriptions` | Service role can manage subscriptions | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| `subscriptions` | Users can view their own subscriptions | `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` |
| `tasks` | tasks_insert | `supabase/migrations/20250816134720_tasks_rls_compat.sql` |
| `tasks` | tasks_select | `supabase/migrations/20250816134720_tasks_rls_compat.sql` |
| `tasks` | tasks_update | `supabase/migrations/20250816134720_tasks_rls_compat.sql` |
| `tasks` | tasks_worker_assignee_select | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `team_communications` | insert_comms | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `team_communications` | read_all_comms | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `team_communications` | team_communications_select | `supabase/migrations/20250812093500_entity_rls_policies_more.sql` |
| `team_communications` | team_communications_worker_read_recipient | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `team_communications` | team_communications_write | `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` |
| `team_communications` | update_comms | `supabase/migrations/20250818120000_admin_staffing_core.sql` |
| `team_project_assignments` | Team contractors can view their assignments | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `team_project_assignments` | Venue owners can manage team project assignments | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `their` | Photo owners can delete any tags | `supabase/migrations/20250208000000_photo_album_marketplace_system.sql` |
| `thread_members` | thread_members_manage_admin | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `thread_members` | thread_members_select_members | `supabase/migrations/20260520224000_group_threads_model.sql` |
| `ticket_allocation_managers` | ticket_allocation_managers_select | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| `ticket_allocations` | ticket_allocations_all | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_allocations` | unified_ticket_allocations_select | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| `ticket_analytics` | ticket_analytics_org_read | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| `ticket_analytics_events` | ticket_analytics_events_insert | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_analytics_events` | ticket_analytics_events_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_campaigns` | ticket_campaigns_all | `supabase/migrations/20260328130000_ticketing_v2.sql` |
| `ticket_checkins` | ticket_checkins_insert | `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql` |
| `ticket_checkins` | ticket_checkins_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_checkpoints` | ticket_checkpoints_select | `supabase/migrations/20260825020000_door_operations.sql` |
| `ticket_checkpoints` | ticket_checkpoints_write | `supabase/migrations/20260825020000_door_operations.sql` |
| `ticket_credentials` | ticket_credentials_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_inventory_reservations` | ticket_reservations_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_invites` | ticket_invites_select | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` |
| `ticket_ownership_events` | ticket_ownership_events_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_referrals` | ticket_referrals_owner_write | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| `ticket_referrals` | ticket_referrals_participant_read | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| `ticket_revenue_allocations` | ticket_revenue_allocations_all | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_sales` | Admins can manage all sales | `supabase/migrations/archive/setup_ticketing_database.sql` |
| `ticket_sales` | ticket_sales_all | `supabase/migrations/20260328130000_ticketing_v2.sql` |
| `ticket_shares` | ticket_shares_owner_write | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| `ticket_shares` | ticket_shares_participant_read | `supabase/migrations/20260910230339_ticketing_admin_overview_contract.sql` |
| `ticket_stripe_webhook_events` | ticket_stripe_webhook_events_deny | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_transfers` | ticket_transfers_insert | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_transfers` | ticket_transfers_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_transfers` | ticket_transfers_update | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `ticket_types` | Admins can manage all tickets | `supabase/migrations/archive/setup_ticketing_database.sql` |
| `ticket_types` | Public can view active ticket types | `supabase/migrations/archive/setup_ticketing_database.sql` |
| `ticket_types` | ticket_types_all | `supabase/migrations/20260328130000_ticketing_v2.sql` |
| `tickets` | tickets_owner_update | `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql` |
| `tickets` | tickets_select | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` |
| `tour_artists` | tour_artists_all | `supabase/migrations/20250818121000_tours_core.sql` |
| `tour_artists` | tour_artists_collaborator_insert | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_artists` | tour_artists_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_artists` | tour_artists_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_artists` | tour_artists_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_artists` | tour_artists_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_artists` | tour_artists_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_artists` | tour_artists_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_collaboration_invitations` | tour_collaboration_invites_manage_delete | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_collaboration_invitations` | tour_collaboration_invites_manage_insert | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_collaboration_invitations` | tour_collaboration_invites_manage_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_collaboration_invitations` | tour_collaboration_invites_manage_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_events` | tour_events_all | `supabase/migrations/20250818121000_tours_core.sql` |
| `tour_events` | tour_events_delete | `supabase/migrations/20260825140000_phase4_tour_events_org_match_and_ghost_sweep.sql` |
| `tour_events` | tour_events_insert | `supabase/migrations/20260825140000_phase4_tour_events_org_match_and_ghost_sweep.sql` |
| `tour_events` | tour_events_select | `supabase/migrations/20260710032640_harden_tour_events_org_rls.sql` |
| `tour_events` | tour_events_tour_collaborator_delete | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_events` | tour_events_tour_collaborator_insert | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_events` | tour_events_tour_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_events` | tour_events_tour_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_events` | tour_events_update | `supabase/migrations/20260825140000_phase4_tour_events_org_match_and_ghost_sweep.sql` |
| `tour_plan_quarantine` | tour_plan_quarantine_select | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| `tour_plan_quarantine` | tour_plan_quarantine_write | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| `tour_stops` | tour_stops_select | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| `tour_stops` | tour_stops_write | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| `tour_team_members` | Beta access - users can manage team members | `supabase/migrations/20250130000001_tour_teams.sql` |
| `tour_team_members` | Beta access - users can view team members | `supabase/migrations/20250130000001_tour_teams.sql` |
| `tour_team_members` | team_read_owner_or_team | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `tour_team_members` | team_write_owner_only | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `tour_team_members` | tour_team_members_all | `supabase/migrations/20250818121000_tours_core.sql` |
| `tour_team_members` | tour_team_members_collaborator_insert | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_team_members` | tour_team_members_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_team_members` | tour_team_members_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_team_members` | tour_team_members_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_team_members` | tour_team_members_delete_org | `supabase/migrations/20260710032714_harden_tour_satellite_rls.sql` |
| `tour_team_members` | tour_team_members_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_team_members` | tour_team_members_insert_org | `supabase/migrations/20260710032714_harden_tour_satellite_rls.sql` |
| `tour_team_members` | tour_team_members_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_team_members` | tour_team_members_select_org | `supabase/migrations/20260710032714_harden_tour_satellite_rls.sql` |
| `tour_team_members` | tour_team_members_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_team_members` | tour_team_members_update_org | `supabase/migrations/20260710032714_harden_tour_satellite_rls.sql` |
| `tour_team_members` | Users can delete their tour team members | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_team_members` | Users can insert their tour team members | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_team_members` | Users can update their tour team members | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_team_members` | Users can view their tour team members | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_teams` | Beta access - users can manage teams | `supabase/migrations/20250130000001_tour_teams.sql` |
| `tour_teams` | Beta access - users can view teams | `supabase/migrations/20250130000001_tour_teams.sql` |
| `tour_teams` | tour_teams_all | `supabase/migrations/20250818121000_tours_core.sql` |
| `tour_teams` | tour_teams_collaborator_insert | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_teams` | tour_teams_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_teams` | tour_teams_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_teams` | tour_teams_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_teams` | tour_teams_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_teams` | tour_teams_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_teams` | tour_teams_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_vendors` | tour_vendors_all | `supabase/migrations/20250818121000_tours_core.sql` |
| `tour_vendors` | tour_vendors_collaborator_insert | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_vendors` | tour_vendors_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_vendors` | tour_vendors_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tour_vendors` | tour_vendors_delete | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_vendors` | tour_vendors_insert | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_vendors` | tour_vendors_select | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_vendors` | tour_vendors_update | `supabase/migrations/20260720020544_admin_tour_collaboration_security.sql` |
| `tour_vendors` | Users can delete their tour vendors | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_vendors` | Users can insert their tour vendors | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_vendors` | Users can update their tour vendors | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_vendors` | Users can view their tour vendors | `supabase/migrations/archive/fix_tour_tables.sql` |
| `tour_vendors` | vendors_read_owner_or_team | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `tour_vendors` | vendors_write_owner_only | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `tour_versions` | tour_versions_select | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| `tour_versions` | tour_versions_write | `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql` |
| `tours` | tours_delete_owner | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| `tours` | tours_delete_owner_or_org | `supabase/migrations/20260720020302_admin_tour_stop_publish.sql` |
| `tours` | tours_insert_owner | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| `tours` | tours_insert_owner_or_org | `supabase/migrations/20260720020302_admin_tour_stop_publish.sql` |
| `tours` | tours_read | `supabase/migrations/20250818121000_tours_core.sql` |
| `tours` | tours_read_owner_or_team | `supabase/migrations/20250813122000_rls_tour_team_access.sql` |
| `tours` | tours_select_owner_or_team | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| `tours` | tours_select_owner_team_or_org | `supabase/migrations/20260710032640_harden_tour_events_org_rls.sql` |
| `tours` | tours_tour_collaborator_select | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tours` | tours_tour_collaborator_update | `supabase/migrations/20260731193454_streamlined_tour_builder_quick_start.sql` |
| `tours` | tours_update_owner | `supabase/migrations/20260710024052_fix_tours_rls_recursion.sql` |
| `tours` | tours_update_owner_or_org | `supabase/migrations/20260720020302_admin_tour_stop_publish.sql` |
| `tours` | tours_write | `supabase/migrations/20250818121000_tours_core.sql` |
| `tours` | Users can manage their own tours | `supabase/migrations/archive/critical_missing_tables.sql` |
| `transportation_passenger_assignments` | transport_passenger_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `transportation_passenger_assignments` | transport_passenger_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `transportation_passenger_assignments` | transportation_passenger_assignments_org_scope_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `travel_coordination_timeline` | travel_coordination_timeline_org_scope_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `travel_coordination_timeline` | travel_timeline_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `travel_coordination_timeline` | travel_timeline_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `travel_group_members` | travel_group_members_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `travel_group_members` | travel_group_members_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `travel_groups` | travel_groups_manage | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `travel_groups` | travel_groups_select | `supabase/migrations/20260413220500_tighten_logistics_rls.sql` |
| `user_accounts` | Users can insert their own accounts | `supabase/migrations/archive/COMPREHENSIVE_SCALABLE_SOLUTION.sql` |
| `user_accounts` | Users can update their own accounts | `supabase/migrations/archive/COMPREHENSIVE_SCALABLE_SOLUTION.sql` |
| `user_accounts` | Users can view their own accounts | `supabase/migrations/archive/COMPREHENSIVE_SCALABLE_SOLUTION.sql` |
| `user_active_profiles` | Service role can manage active profiles | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `user_active_profiles` | Users can manage own active profiles | `supabase/migrations/20250101000000_fix_authentication_system.sql` |
| `user_active_profiles` | Users can manage their own active profile | `supabase/migrations/archive/emergency-fix-safe.sql` |
| `user_active_profiles` | Users can view their own active profile | `supabase/migrations/archive/emergency-fix-safe.sql` |
| `user_music_library` | user_music_library_owner_manage | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `user_music_library` | user_music_library_owner_read | `supabase/migrations/20260410183000_music_commerce_expansion.sql` |
| `user_opportunity_interactions` | user_opportunity_interactions_insert_owner | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| `user_opportunity_interactions` | user_opportunity_interactions_read_owner | `supabase/migrations/20260326150000_opportunities_rss_pipeline.sql` |
| `user_profile_featured_tracks` | featured_tracks_owner_manage | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `user_profile_featured_tracks` | featured_tracks_public_read_active | `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` |
| `user_reward_wallets` | user_reward_wallets_select_own | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| `user_reward_wallets` | user_reward_wallets_write_own | `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql` |
| `user_sessions` | user_sessions_owner_all | `supabase/migrations/20260825121000_phase1_rpc_actor_binding.sql` |
| `user_sessions` | Users can manage their own sessions | `supabase/migrations/archive/simple_auth_fix.sql` |
| `user_sessions` | Users can view their own sessions | `supabase/migrations/archive/simple_auth_fix.sql` |
| `vendor_contracts` | vendor_contracts_org_member_all | `supabase/migrations/20260825131000_phase3_phantom_tables_promotion.sql` |
| `venue_analytics` | Venue owners can view their analytics | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_availability` | Anyone can view venue availability | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_availability` | Venue owners can manage their availability | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_booking_lifecycle_history` | vblh_operator_read | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| `venue_booking_requests` | booking_requests_delete | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| `venue_booking_requests` | booking_requests_insert | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| `venue_booking_requests` | booking_requests_select | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| `venue_booking_requests` | booking_requests_update | `supabase/migrations/20260823130000_booking_lifecycle.sql` |
| `venue_booking_requests` | Users can view and manage their own booking requests | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_booking_requests` | Venue owners can manage all booking requests for their venues | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_booking_slots` | public_can_view_open_slots | `supabase/migrations/20250814124500_venue_recurring.sql` |
| `venue_booking_slots` | venue_slots_owner | `supabase/migrations/20250814124500_venue_recurring.sql` |
| `venue_contacts` | venue_contacts_operator_access | `supabase/migrations/20260823080000_contact_reconciliation.sql` |
| `venue_crew_members` | Anyone can view available crew members | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `venue_crew_members` | Crew members can view and update their own profile | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `venue_crew_members` | Venue owners can manage their crew members | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `venue_documents` | Public documents are viewable by everyone | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_documents` | Venue owners can manage their venue documents | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_equipment` | Anyone can view available rental equipment | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_equipment` | Venue owners can manage their equipment | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_equipment` | venue_equipment_owner_all | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_equipment` | venue_equipment_public_rental | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_identity_bridges` | venue_identity_bridges_owner_read | `supabase/migrations/20260823010000_venue_identity_bridge.sql` |
| `venue_kit_settings` | venue_kit_settings_owner_delete | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| `venue_kit_settings` | venue_kit_settings_owner_insert | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| `venue_kit_settings` | venue_kit_settings_owner_select | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| `venue_kit_settings` | venue_kit_settings_owner_update | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| `venue_kit_settings` | venue_kit_settings_public_read | `supabase/migrations/20260728000000_venue_kit_settings.sql` |
| `venue_ownership_transfers` | venue_ownership_transfers_participant_read | `supabase/migrations/20260823120000_venue_account_lifecycle.sql` |
| `venue_permissions` | venue_permissions_read | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_pricing` | Anyone can view active pricing packages | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_pricing` | Venue owners can manage their pricing | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_profiles` | Public can view verified venue profiles | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `venue_profiles` | Users can insert their own venue profile | `supabase/migrations/archive/complete_migration.sql` |
| `venue_profiles` | Users can manage their own venue profiles | `supabase/migrations/archive/missing_auth_tables.sql` |
| `venue_profiles` | Users can update their own venue profile | `supabase/migrations/archive/complete_migration.sql` |
| `venue_profiles` | Users can view all venue profiles | `supabase/migrations/archive/missing_auth_tables.sql` |
| `venue_profiles` | Users can view their own venue profiles | `supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql` |
| `venue_profiles` | Venue profiles are viewable by everyone | `supabase/migrations/archive/complete_migration.sql` |
| `venue_profiles` | venue_profiles_delete_policy | `supabase/migrations/archive/VENUE_ACCESS_FIX.sql` |
| `venue_profiles` | venue_profiles_insert_policy | `supabase/migrations/archive/VENUE_ACCESS_FIX.sql` |
| `venue_profiles` | venue_profiles_select_policy | `supabase/migrations/archive/VENUE_ACCESS_FIX.sql` |
| `venue_profiles` | venue_profiles_update_policy | `supabase/migrations/archive/VENUE_ACCESS_FIX.sql` |
| `venue_recurring_shifts` | venue_recurring_shifts_owner | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_recurring_templates` | venue_templates_owner | `supabase/migrations/20250814124500_venue_recurring.sql` |
| `venue_reservations` | venue_reservations_operator | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| `venue_reservations` | venue_reservations_public_read | `supabase/migrations/20260823140000_reservation_conflict_engine.sql` |
| `venue_reviews` | Anyone can view venue reviews | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_reviews` | Reviewers can update their own reviews | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_reviews` | Users can create reviews | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_reviews` | Venue owners can respond to reviews | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_role_permissions` | venue_role_permissions_owner | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_roles` | venue_roles_owner_manage | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_roles` | venue_roles_staff_read | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_shift_assignments` | venue_shift_assignments_auth | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_shift_assignments` | venue_shift_assignments_manage | `supabase/migrations/20260823072000_shift_rls_hardening.sql` |
| `venue_shift_assignments` | venue_shift_assignments_select | `supabase/migrations/20260823072000_shift_rls_hardening.sql` |
| `venue_shift_assignments` | venue_shift_assignments_worker_update | `supabase/migrations/20260823072000_shift_rls_hardening.sql` |
| `venue_shifts` | venue_shifts_operator_read | `supabase/migrations/20260823072000_shift_rls_hardening.sql` |
| `venue_shifts` | venue_shifts_owner | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_shifts` | venue_shifts_staff_read | `supabase/migrations/20260413200000_port_missing_tables.sql` |
| `venue_slug_history` | venue_slug_history_public_read | `supabase/migrations/20260823020000_venue_slug_repair.sql` |
| `venue_social_integrations` | Venue owners can manage their social integrations | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_team_contractors` | Team contractors can view and update their own profile | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `venue_team_contractors` | Venue owners can manage their team contractors | `supabase/migrations/archive/enhanced_staff_management_schema.sql` |
| `venue_team_members` | Team members can view their own profile | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_team_members` | Venue owners can manage their team members | `supabase/migrations/archive/VENUE_MIGRATION_SAFE_RERUN.sql` |
| `venue_workflow_subscriptions` | venue_workflow_subs_owner_all | `supabase/migrations/20260825050000_venue_notification_routing.sql` |
| `venues` | venues_owner_write | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `venues` | venues_public_read | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| `venues_v2` | venues_v2_delete | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `venues_v2` | venues_v2_insert | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `venues_v2` | venues_v2_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `venues_v2` | venues_v2_update | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `venues_v2` | venues_v2_worker_assignment_select | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `vote_kind` | vote_kind_select | `supabase/migrations/20260414140000_fix_security_linter_views_and_rls.sql` |
| `work_mode_publication_audiences` | work_mode_publication_audiences_publisher_manage | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| `work_mode_publication_audiences` | work_mode_publication_audiences_worker_read | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| `work_mode_publications` | work_mode_publications_manage | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `work_mode_publications` | work_mode_publications_select | `supabase/migrations/20260630211500_operations_work_mode_publications.sql` |
| `work_mode_publications` | work_mode_publications_worker_assignment_select | `supabase/migrations/20260911013017_work_mode_overview_communications.sql` |
| `work_mode_publications` | work_mode_publications_worker_select | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| `worker_onboarding_profiles` | worker_onboarding_profiles_owner | `supabase/migrations/20260709210901_worker_onboarding_profiles.sql` |
| `workflow_events_audit` | workflow_audit_read | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_events_audit` | workflow_audit_write | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_executions` | wf_executions_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `workflow_executions` | workflow_executions_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `workflow_messages` | workflow_messages_read | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_messages` | workflow_messages_write | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_participants` | workflow_participants_read | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_participants` | workflow_participants_write | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_tasks` | workflow_tasks_read | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_tasks` | workflow_tasks_write | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_templates` | wf_templates_all | `supabase/migrations/20260328160000_logistics_vendor_tables.sql` |
| `workflow_templates` | workflow_templates_owner_all | `supabase/migrations/20260825120000_phase1_org_scoped_finance_logistics_rls.sql` |
| `workflow_threads` | workflow_threads_read | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workflow_threads` | workflow_threads_write | `supabase/migrations/20260409150000_unified_workflow_threads.sql` |
| `workforce_channel_links` | workforce_channel_links_manager_manage | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| `workforce_channel_links` | workforce_channel_links_worker_read | `supabase/migrations/20260819205907_connected_worker_work_hub.sql` |
| `world_artist_places` | world_artist_places_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_claims` | world_claims_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_cultural_entities` | world_cultural_entities_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_cultural_entity_places` | world_cultural_entity_places_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_cultural_relationships` | world_cultural_relationships_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_geo_signals` | world_geo_signals_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_media_assets` | world_media_assets_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_radio_station_places` | world_radio_station_places_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_radio_stations` | world_radio_stations_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_relation_types` | world_relation_types_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_sources` | world_sources_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
| `world_track_places` | world_track_places_public_read | `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` |
