set client_min_messages = warning;

create or replace function notify_event_group_message_recipients()
returns trigger
language plpgsql
as $$
declare
  chat_row event_group_chats%rowtype;
  member_id uuid;
begin
  select *
  into chat_row
  from event_group_chats
  where id = new.group_id;

  if chat_row.id is null then
    return new;
  end if;

  if chat_row.member_ids is null then
    return new;
  end if;

  foreach member_id in array chat_row.member_ids
  loop
    if member_id is null or member_id = new.sender_id then
      continue;
    end if;

    if should_send_notification(member_id, 'group_message') then
      insert into notifications(
        user_id,
        related_user_id,
        type,
        title,
        content,
        metadata,
        created_at
      ) values (
        member_id,
        new.sender_id,
        'group_message',
        'New event group message',
        left(new.content, 140),
        jsonb_build_object(
          'event_group_chat_id', new.group_id,
          'event_id', new.event_id,
          'message_id', new.id
        ),
        now()
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_event_group_message_notifications on event_group_messages;
create trigger trg_event_group_message_notifications
after insert on event_group_messages
for each row execute function notify_event_group_message_recipients();
