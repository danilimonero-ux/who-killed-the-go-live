ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'lobby',
  ADD COLUMN IF NOT EXISTS evidence_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solved_at timestamptz,
  ADD COLUMN IF NOT EXISTS finish_seconds integer,
  ADD COLUMN IF NOT EXISTS decision text,
  ADD COLUMN IF NOT EXISTS red_herrings integer NOT NULL DEFAULT 0;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;