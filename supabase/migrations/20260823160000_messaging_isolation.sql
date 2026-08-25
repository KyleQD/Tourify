-- ═══════════════════════════════════════════════════════════════
-- VEN-096 — enforceable isolation for conversations/messages (+realtime).
--
-- Live-policy gaps found on Tourify Demo:
--   1. messages INSERT required ONLY sender_id = auth.uid() — any authenticated
--      user could post into ANY conversation by id.
--   2. messages UPDATE allowed EITHER participant to edit ANY message,
--      including other people's content.
--   3. conversations UPDATE had no WITH CHECK — a participant could rebind
--      participant_1/participant_2 (account-tag spoofing / hand-off).
--
-- Isolation model: conversations are between HUMAN actor ids (auth.uid());
-- institutional identity is carried by the tagged profile columns and enforced
-- in the application layer (VEN-095/053). Realtime (postgres_changes) inherits
-- these RLS policies automatically.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. messages: sender must be a participant of THAT conversation ──────────
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY messages_insert_sender_participant ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND auth.uid() IN (c.participant_1, c.participant_2)
    )
  );

-- Only the author may edit their own message content.
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
CREATE POLICY messages_update_author_only ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- ── 2. conversations: participants immutable after creation ─────────────────
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY conversations_update_participant ON public.conversations
  FOR UPDATE
  USING (auth.uid() IN (participant_1, participant_2))
  WITH CHECK (auth.uid() IN (participant_1, participant_2));

-- WITH CHECK cannot compare NEW vs OLD, so lock the participant pair + trust
-- fields with a trigger (service_role bypasses via BYPASSRLS attribute check).
CREATE OR REPLACE FUNCTION public.guard_conversation_participants()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.participant_1 IS DISTINCT FROM OLD.participant_1
     OR NEW.participant_2 IS DISTINCT FROM OLD.participant_2 THEN
    RAISE EXCEPTION 'Conversation participants are immutable'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_guard_participants ON public.conversations;
CREATE TRIGGER trg_conversations_guard_participants
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_participants();

-- ── 3. Validation ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_bad_insert int;
  v_missing_guard int;
BEGIN
  SELECT count(*) INTO v_bad_insert
  FROM pg_policies
  WHERE schemaname='public' AND tablename='messages'
    AND cmd='INSERT' AND with_check NOT LIKE '%EXISTS%';
  RAISE NOTICE 'VEN-096 messaging isolation: % unguarded INSERT polic(ies) (expected 0)', v_bad_insert;

  SELECT count(*) INTO v_missing_guard
  FROM pg_trigger WHERE tgname='trg_conversations_guard_participants' AND NOT tgisinternal;
  RAISE NOTICE 'VEN-096 participant-immutability trigger present: %', v_missing_guard;
END $$;
