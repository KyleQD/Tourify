-- PUB-204: Atomic transactional publish
-- Snapshot + sections + audience + recipients + deliveries + lifecycle + domain/outbox.
-- Duplicate (org_id, idempotency_key) returns the original publication without mutation.

create or replace function public.admin_publication_transactional_publish(
  p_org_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_correlation_id text,
  p_snapshot jsonb,
  p_sections jsonb,
  p_audience jsonb,
  p_recipients jsonb,
  p_deliveries jsonb,
  p_lifecycle jsonb default null,
  p_command_name text default 'publication.publish'
)
returns table (
  snapshot_id uuid,
  domain_transaction_id uuid,
  outbox_id uuid,
  already_existed boolean,
  sequence integer,
  version integer,
  checksum text,
  correlation_id text
)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_existing public.admin_publication_snapshots%rowtype;
  v_snapshot_id uuid;
  v_tx_id uuid;
  v_outbox_id uuid;
  v_correlation text;
  v_sequence integer;
  v_version integer;
  v_checksum text;
  v_tour_id uuid;
  v_published_at timestamptz := now();
  v_section jsonb;
  v_recipient jsonb;
  v_delivery jsonb;
  v_recipient_id uuid;
  v_ord integer := 0;
begin
  if p_org_id is null then
    raise exception 'org_id is required';
  end if;
  if coalesce(nullif(btrim(p_idempotency_key), ''), '') = '' then
    raise exception 'idempotency_key is required';
  end if;
  if p_actor_user_id is null then
    raise exception 'actor_user_id is required';
  end if;
  if not public.can_publication(p_actor_user_id, p_org_id, 'tour.manage')
     and not public.has_perm(p_actor_user_id, p_org_id, 'tour.publish') then
    raise exception 'Tour publish capability is required' using errcode = '42501';
  end if;

  v_correlation := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);

  select s.* into v_existing
  from public.admin_publication_snapshots s
  where s.org_id = p_org_id
    and s.idempotency_key = p_idempotency_key
  limit 1;

  if found then
    select o.id, o.domain_transaction_id
      into v_outbox_id, v_tx_id
    from public.admin_publication_outbox o
    where o.org_id = p_org_id
      and o.idempotency_key = p_idempotency_key
    limit 1;

    return query select
      v_existing.id,
      coalesce(v_tx_id, v_existing.domain_transaction_id),
      v_outbox_id,
      true,
      v_existing.sequence,
      v_existing.version,
      v_existing.checksum,
      v_existing.correlation_id;
    return;
  end if;

  v_sequence := greatest(coalesce((p_snapshot->>'sequence')::integer, 1), 1);
  v_version := greatest(coalesce((p_snapshot->>'version')::integer, 1), 1);
  v_checksum := nullif(btrim(coalesce(p_snapshot->>'checksum', '')), '');
  if v_checksum is null then
    raise exception 'snapshot checksum is required';
  end if;

  insert into public.admin_domain_transactions (
    org_id, command_name, correlation_id, actor_user_id, payload
  ) values (
    p_org_id,
    coalesce(nullif(btrim(p_command_name), ''), 'publication.publish'),
    v_correlation,
    p_actor_user_id,
    jsonb_build_object(
      'kind', 'publication.transactional_publish',
      'snapshot', p_snapshot,
      'audience', p_audience,
      'delivery_count', coalesce(jsonb_array_length(p_deliveries), 0),
      'lifecycle', coalesce(p_lifecycle, 'null'::jsonb)
    )
  )
  returning id into v_tx_id;

  insert into public.admin_publication_snapshots (
    org_id,
    tour_id,
    event_id,
    publication_type,
    title,
    sequence,
    version,
    source_plan_version,
    checksum,
    access_classification,
    projection_policy,
    projection_version,
    payload,
    publisher_user_id,
    status,
    correlation_id,
    idempotency_key,
    domain_transaction_id,
    published_at
  ) values (
    p_org_id,
    nullif(p_snapshot->>'tour_id', '')::uuid,
    nullif(p_snapshot->>'event_id', '')::uuid,
    p_snapshot->>'publication_type',
    coalesce(nullif(btrim(p_snapshot->>'title'), ''), 'Publication'),
    v_sequence,
    v_version,
    nullif(p_snapshot->>'source_plan_version', '')::integer,
    v_checksum,
    coalesce(p_snapshot->>'access_classification', 'worker'),
    coalesce(p_snapshot->'projection_policy', '{}'::jsonb),
    coalesce(nullif(btrim(p_snapshot->>'projection_version'), ''), 'v1'),
    coalesce(p_snapshot->'payload', '{}'::jsonb),
    p_actor_user_id,
    'committed',
    v_correlation,
    p_idempotency_key,
    v_tx_id,
    v_published_at
  )
  returning id into v_snapshot_id;

  if p_sections is not null and jsonb_typeof(p_sections) = 'array' then
    for v_section in select value from jsonb_array_elements(p_sections)
    loop
      insert into public.admin_publication_sections (
        org_id, snapshot_id, section_key, audience_class, source_ref, payload, checksum, ordinal
      ) values (
        p_org_id,
        v_snapshot_id,
        v_section->>'section_key',
        coalesce(v_section->>'audience_class', 'worker'),
        coalesce(v_section->'source_ref', '{}'::jsonb),
        coalesce(v_section->'payload', '{}'::jsonb),
        coalesce(v_section->>'checksum', v_checksum),
        coalesce((v_section->>'ordinal')::integer, v_ord)
      );
      v_ord := v_ord + 1;
    end loop;
  end if;

  insert into public.admin_publication_audiences (
    org_id, snapshot_id, definition, evaluated_at, recipient_count, excluded_count
  ) values (
    p_org_id,
    v_snapshot_id,
    coalesce(p_audience->'definition', '{}'::jsonb),
    v_published_at,
    coalesce((p_audience->>'recipient_count')::integer, 0),
    coalesce((p_audience->>'excluded_count')::integer, 0)
  );

  if p_recipients is not null and jsonb_typeof(p_recipients) = 'array' then
    for v_recipient in select value from jsonb_array_elements(p_recipients)
    loop
      insert into public.admin_publication_recipients (
        org_id,
        snapshot_id,
        subject_type,
        subject_key,
        display_name,
        channel_hints,
        exclusion_reason
      ) values (
        p_org_id,
        v_snapshot_id,
        v_recipient->>'subject_type',
        v_recipient->>'subject_key',
        nullif(v_recipient->>'display_name', ''),
        coalesce(v_recipient->'channel_hints', '[]'::jsonb),
        nullif(v_recipient->>'exclusion_reason', '')
      );
    end loop;
  end if;

  if p_deliveries is not null and jsonb_typeof(p_deliveries) = 'array' then
    for v_delivery in select value from jsonb_array_elements(p_deliveries)
    loop
      select r.id into v_recipient_id
      from public.admin_publication_recipients r
      where r.snapshot_id = v_snapshot_id
        and r.subject_type = v_delivery->>'subject_type'
        and r.subject_key = v_delivery->>'subject_key'
        and r.exclusion_reason is null
      limit 1;

      if v_recipient_id is null then
        continue;
      end if;

      insert into public.admin_publication_deliveries (
        org_id, snapshot_id, recipient_id, channel, status, queued_at
      ) values (
        p_org_id,
        v_snapshot_id,
        v_recipient_id,
        v_delivery->>'channel',
        'queued',
        v_published_at
      )
      on conflict (recipient_id, channel) do nothing;
    end loop;
  end if;

  -- Lifecycle transition (tour activate) inside the same transaction.
  if p_lifecycle is not null and jsonb_typeof(p_lifecycle) = 'object' then
    v_tour_id := nullif(p_lifecycle->>'tour_id', '')::uuid;
    if v_tour_id is not null and coalesce(p_lifecycle->>'set_status', '') = 'active' then
      update public.tours t
      set status = 'active',
          settings = jsonb_set(
            coalesce(t.settings, '{}'::jsonb),
            '{published_at}',
            to_jsonb(v_published_at),
            true
          ),
          updated_at = v_published_at
      where t.id = v_tour_id
        and t.org_id = p_org_id;

      if not found then
        raise exception 'Tour is not available to the acting organization';
      end if;

      -- Compatibility Work Mode fan-out (idempotent).
      insert into public.work_mode_publications (
        event_id,
        tour_id,
        publication_type,
        title,
        payload,
        published_by,
        published_at,
        status,
        idempotency_key
      )
      select
        e.id,
        v_tour_id,
        'tour_publish',
        'Tour published: ' || coalesce(t.name, 'Tour'),
        jsonb_build_object(
          'tour_id', v_tour_id,
          'event_id', e.id,
          'status', 'active',
          'snapshot_id', v_snapshot_id
        ),
        p_actor_user_id,
        v_published_at,
        'published',
        'tour_publish:' || v_tour_id::text || ':' || e.id::text
      from public.tours t
      join public.tour_events te on te.tour_id = t.id
      join public.events_v2 e on e.id = te.event_id
      where t.id = v_tour_id
        and t.org_id = p_org_id
        and e.org_id = p_org_id
      on conflict (idempotency_key) do update
      set title = excluded.title,
          payload = excluded.payload,
          published_by = excluded.published_by,
          published_at = excluded.published_at,
          status = 'published',
          updated_at = excluded.published_at;
    end if;
  end if;

  insert into public.admin_publication_outbox (
    org_id,
    domain_transaction_id,
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    idempotency_key,
    correlation_id,
    snapshot_id,
    max_attempts
  ) values (
    p_org_id,
    v_tx_id,
    'publication.committed',
    'publication_snapshot',
    v_snapshot_id::text,
    jsonb_build_object(
      'snapshotId', v_snapshot_id,
      'publicationType', p_snapshot->>'publication_type',
      'tourId', p_snapshot->>'tour_id',
      'eventId', p_snapshot->>'event_id',
      'checksum', v_checksum,
      'deliveryCount', coalesce(jsonb_array_length(p_deliveries), 0),
      'correlationId', v_correlation
    ),
    p_idempotency_key,
    v_correlation,
    v_snapshot_id,
    8
  )
  returning id into v_outbox_id;

  -- Link queued deliveries to the fan-out outbox row.
  update public.admin_publication_deliveries d
  set outbox_id = v_outbox_id,
      updated_at = v_published_at
  where d.snapshot_id = v_snapshot_id
    and d.outbox_id is null;

  return query select
    v_snapshot_id,
    v_tx_id,
    v_outbox_id,
    false,
    v_sequence,
    v_version,
    v_checksum,
    v_correlation;
end;
$$;

revoke all on function public.admin_publication_transactional_publish(
  uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from public;
grant execute on function public.admin_publication_transactional_publish(
  uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to authenticated, service_role;

comment on function public.admin_publication_transactional_publish(
  uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text
) is
  'PUB-204: commit snapshot, audience, deliveries, lifecycle, audit domain tx, and outbox atomically; duplicate idempotency returns original.';
