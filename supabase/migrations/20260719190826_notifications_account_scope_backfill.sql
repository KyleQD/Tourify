-- Account-scoped notifications: tag social/DM/contract writers + backfill rows.
-- Safe / idempotent. Does not drop tables or RLS policies.

-- ---------------------------------------------------------------------------
-- 1) Follow request / acceptance → personal inbox
-- ---------------------------------------------------------------------------
create or replace function public.create_follow_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_profile record;
begin
  if not public.should_send_notification(new.target_id, 'follow_request', 'normal') then
    return new;
  end if;

  select full_name, username into requester_profile
  from public.profiles
  where id = new.requester_id
  limit 1;

  insert into public.notifications (
    user_id, type, title, content, summary, related_user_id, priority, is_read,
    target_profile_id, target_account_type
  ) values (
    new.target_id,
    'follow_request',
    'New Follow Request',
    coalesce(requester_profile.full_name, requester_profile.username, 'Someone') || ' wants to follow you',
    'New follow request',
    new.requester_id,
    'normal',
    false,
    new.target_id,
    'general'
  );

  return new;
end;
$$;

create or replace function public.create_follow_acceptance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile record;
begin
  if new.status = 'accepted' and (old.status is null or old.status <> 'accepted') then
    if not public.should_send_notification(new.requester_id, 'follow_accepted', 'normal') then
      return new;
    end if;

    select full_name, username into target_profile
    from public.profiles
    where id = new.target_id
    limit 1;

    insert into public.notifications (
      user_id, type, title, content, summary, related_user_id, priority, is_read,
      target_profile_id, target_account_type
    ) values (
      new.requester_id,
      'follow_accepted',
      'Follow Request Accepted',
      coalesce(target_profile.full_name, target_profile.username, 'User') || ' accepted your follow request',
      'Follow request accepted',
      new.target_id,
      'normal',
      false,
      new.requester_id,
      'general'
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Social like / comment / share → personal inbox
-- ---------------------------------------------------------------------------
create or replace function public.create_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  liker_profile record;
  post_content_preview text;
begin
  if not public.should_send_notification(
    (select user_id from public.posts where id = new.post_id),
    'like',
    'normal'
  ) then
    return new;
  end if;

  select user_id, left(content, 100) into post_author_id, post_content_preview
  from public.posts where id = new.post_id;

  select full_name, username into liker_profile
  from public.profiles where id = new.user_id;

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, target_profile_id, target_account_type
    ) values (
      post_author_id, 'like', 'New Like',
      coalesce(liker_profile.full_name, liker_profile.username, 'Someone')
        || ' liked your post: "' || post_content_preview || '"',
      'New like received',
      new.user_id, new.post_id, 'post',
      'normal', false,
      post_author_id, 'general'
    );
  end if;

  return new;
end;
$$;

create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  commenter_profile record;
  post_content_preview text;
  comment_preview text;
begin
  if not public.should_send_notification(
    (select user_id from public.posts where id = new.post_id),
    'comment',
    'normal'
  ) then
    return new;
  end if;

  select user_id, left(content, 100) into post_author_id, post_content_preview
  from public.posts where id = new.post_id;

  select full_name, username into commenter_profile
  from public.profiles where id = new.user_id;

  comment_preview := left(new.content, 50);

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, metadata, target_profile_id, target_account_type
    ) values (
      post_author_id, 'comment', 'New Comment',
      coalesce(commenter_profile.full_name, commenter_profile.username, 'Someone')
        || ' commented on your post: "' || comment_preview || '"',
      'New comment received',
      new.user_id, new.post_id, 'post',
      'normal', false,
      jsonb_build_object(
        'post_content', post_content_preview,
        'comment_id', new.id,
        'comment_preview', comment_preview
      ),
      post_author_id, 'general'
    );
  end if;

  return new;
end;
$$;

create or replace function public.create_share_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  sharer_profile record;
  post_content_preview text;
begin
  if not public.should_send_notification(
    (select user_id from public.posts where id = new.post_id),
    'share',
    'normal'
  ) then
    return new;
  end if;

  select user_id, left(content, 100) into post_author_id, post_content_preview
  from public.posts where id = new.post_id;

  select full_name, username into sharer_profile
  from public.profiles where id = new.user_id;

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, metadata, target_profile_id, target_account_type
    ) values (
      post_author_id, 'share', 'Post Shared',
      coalesce(sharer_profile.full_name, sharer_profile.username, 'Someone')
        || ' shared your post: "' || post_content_preview || '"',
      'Post shared',
      new.user_id, new.post_id, 'post',
      'normal', false,
      jsonb_build_object(
        'post_content', post_content_preview,
        'shared_to', coalesce(new.shared_to, 'feed')
      ),
      post_author_id, 'general'
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) DM fanout → personal inbox
-- ---------------------------------------------------------------------------
create or replace function public.notify_dm_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation_row conversations%rowtype;
  recipient_id uuid;
  notification_type text := 'message';
begin
  select * into conversation_row
  from conversations
  where id = new.conversation_id;

  if conversation_row.id is null then
    return new;
  end if;

  if conversation_row.participant_1 = new.sender_id then
    recipient_id := conversation_row.participant_2;
  else
    recipient_id := conversation_row.participant_1;
  end if;

  if recipient_id is null or recipient_id = new.sender_id then
    return new;
  end if;

  if coalesce(conversation_row.trust_tier, 'open') = 'request' then
    notification_type := 'message_request';
  end if;

  if should_send_notification(recipient_id, notification_type) then
    insert into notifications (
      user_id,
      related_user_id,
      type,
      title,
      content,
      metadata,
      created_at,
      target_profile_id,
      target_account_type
    )
    values (
      recipient_id,
      new.sender_id,
      notification_type,
      case
        when notification_type = 'message_request' then 'New message request'
        else 'New message'
      end,
      left(coalesce(new.content, ''), 140),
      jsonb_build_object(
        'conversation_id', new.conversation_id,
        'message_id', new.id
      ),
      now(),
      recipient_id,
      'general'
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Contract counterparty notify → personal inbox
-- ---------------------------------------------------------------------------
create or replace function public.notify_contract_counterparty(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select id, user_id, counterparty_user_id, title
  into r
  from public.artist_contracts
  where id = p_contract_id;

  if r.id is null or r.counterparty_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id, type, title, content, metadata,
    target_profile_id, target_account_type
  )
  values (
    r.counterparty_user_id,
    'collaboration_request',
    'Contract pending your signature',
    coalesce(nullif(trim(r.title), ''), 'A contract needs your review'),
    jsonb_build_object(
      'contract_id', p_contract_id,
      'from_user_id', r.user_id,
      'path', '/contracts/' || p_contract_id::text
    ),
    r.counterparty_user_id,
    'general'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Backfill existing rows
-- ---------------------------------------------------------------------------

-- Actor / employer-scoped types: prefer metadata employer/venue ids
update public.notifications n
set
  target_profile_id = coalesce(
    case
      when (n.metadata->>'employer_entity_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (n.metadata->>'employer_entity_id')::uuid
      else null
    end,
    case
      when (n.metadata->>'venue_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (n.metadata->>'venue_id')::uuid
      else null
    end,
    n.target_profile_id
  ),
  target_account_type = case
    when coalesce(n.metadata->>'employer_entity_type', '') in ('venue') then 'venue'
    when coalesce(n.metadata->>'employer_entity_type', '') in ('artist', 'service')
      then n.metadata->>'employer_entity_type'
    when coalesce(n.metadata->>'employer_entity_type', '') in ('organization', 'organizer', 'admin', 'org')
      then 'organization'
    when (n.metadata->>'venue_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then 'venue'
    when (n.metadata->>'employer_entity_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then 'organization'
    else n.target_account_type
  end
where n.type in (
  'hiring_application_approved_actor',
  'shift_assignment_response'
)
and (
  n.target_profile_id is null
  or n.target_account_type is null
  or n.target_account_type = 'general'
)
and (
  (n.metadata->>'employer_entity_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or (n.metadata->>'venue_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Personal / social / applicant-facing / unknown → general inbox
update public.notifications
set
  target_profile_id = coalesce(target_profile_id, user_id),
  target_account_type = coalesce(nullif(target_account_type, ''), 'general')
where target_profile_id is null
   or target_account_type is null;
