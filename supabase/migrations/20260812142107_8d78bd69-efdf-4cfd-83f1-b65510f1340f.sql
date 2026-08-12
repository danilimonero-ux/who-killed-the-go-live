CREATE TABLE public.discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  object_id text NOT NULL,
  step integer NOT NULL DEFAULT 0,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  player_name text,
  title text NOT NULL,
  detail text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  points_to text,
  delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, object_id, step)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discoveries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discoveries TO authenticated;
GRANT ALL ON public.discoveries TO service_role;

ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discoveries_public" ON public.discoveries
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.discoveries;