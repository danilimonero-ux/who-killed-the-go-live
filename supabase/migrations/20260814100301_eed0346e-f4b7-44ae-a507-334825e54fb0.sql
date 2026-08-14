-- ROOMS
DROP POLICY IF EXISTS rooms_public ON public.rooms;
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rooms_insert ON public.rooms FOR INSERT TO anon, authenticated WITH CHECK (code ~ '^[A-Z0-9]{4,8}$');
CREATE POLICY rooms_update ON public.rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- no DELETE policy: deletes are denied

CREATE OR REPLACE FUNCTION public.rooms_immutable_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.code := OLD.code;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rooms_immutable_code_trg ON public.rooms;
CREATE TRIGGER rooms_immutable_code_trg BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.rooms_immutable_code();

-- PLAYERS
DROP POLICY IF EXISTS players_public ON public.players;
CREATE POLICY players_select ON public.players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY players_insert ON public.players FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id));
CREATE POLICY players_update ON public.players FOR UPDATE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id));
-- no DELETE policy

CREATE OR REPLACE FUNCTION public.players_immutable_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.room_id := OLD.room_id;
  NEW.is_host := OLD.is_host;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS players_immutable_identity_trg ON public.players;
CREATE TRIGGER players_immutable_identity_trg BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.players_immutable_identity();

-- VOTES
DROP POLICY IF EXISTS votes_public ON public.votes;
CREATE POLICY votes_select ON public.votes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY votes_insert ON public.votes FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_id = votes.room_id));
CREATE POLICY votes_update ON public.votes FOR UPDATE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_id = votes.room_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_id = votes.room_id));
-- no DELETE policy

-- ACCUSATIONS (append-only)
DROP POLICY IF EXISTS accusations_public ON public.accusations;
CREATE POLICY accusations_select ON public.accusations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY accusations_insert ON public.accusations FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id)
    AND (player_id IS NULL OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_id = accusations.room_id))
  );
-- no UPDATE/DELETE policies: history is immutable

-- DISCOVERIES (append-only)
DROP POLICY IF EXISTS discoveries_public ON public.discoveries;
CREATE POLICY discoveries_select ON public.discoveries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY discoveries_insert ON public.discoveries FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id)
    AND (player_id IS NULL OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_id = discoveries.room_id))
  );
-- no UPDATE/DELETE policies

-- GAME EVENTS (append-only)
DROP POLICY IF EXISTS game_events_public ON public.game_events;
CREATE POLICY game_events_select ON public.game_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY game_events_insert ON public.game_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id)
    AND (player_id IS NULL OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.room_id = game_events.room_id))
  );
-- no UPDATE/DELETE policies

REVOKE DELETE ON public.rooms, public.players, public.votes, public.accusations, public.discoveries, public.game_events FROM anon, authenticated;
REVOKE UPDATE ON public.accusations, public.discoveries, public.game_events FROM anon, authenticated;
GRANT ALL ON public.rooms, public.players, public.votes, public.accusations, public.discoveries, public.game_events TO service_role;