ALTER TABLE public.players ADD COLUMN IF NOT EXISTS zone text;
UPDATE public.players SET role = NULL WHERE role IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS players_room_role_unique ON public.players (room_id, role) WHERE role IS NOT NULL;