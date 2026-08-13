ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS found_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS done_ids text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.accusations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  role text,
  attempt integer NOT NULL DEFAULT 1,
  what text,
  root text,
  killer text,
  weapon text,
  decision text,
  correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accusations TO anon, authenticated;
GRANT ALL ON public.accusations TO service_role;
ALTER TABLE public.accusations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accusations_public" ON public.accusations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  player_name text,
  role text,
  kind text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_events TO anon, authenticated;
GRANT ALL ON public.game_events TO service_role;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_events_public" ON public.game_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS accusations_room_idx ON public.accusations(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS game_events_room_idx ON public.game_events(room_id, created_at DESC);

ALTER TABLE public.accusations REPLICA IDENTITY FULL;
ALTER TABLE public.game_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accusations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;