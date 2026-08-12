CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  phase text NOT NULL DEFAULT 'lobby',
  round int NOT NULL DEFAULT 0,
  timer_ends_at timestamptz,
  confidence int NOT NULL DEFAULT 100,
  current_suspect text,
  revealed jsonb NOT NULL DEFAULT '[]'::jsonb,
  verdict text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  is_host boolean NOT NULL DEFAULT false,
  power_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  kind text NOT NULL,
  round int NOT NULL DEFAULT 0,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, kind, round)
);

CREATE INDEX idx_players_room ON public.players(room_id);
CREATE INDEX idx_votes_room ON public.votes(room_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.votes TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_public" ON public.rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "players_public" ON public.players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "votes_public" ON public.votes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;