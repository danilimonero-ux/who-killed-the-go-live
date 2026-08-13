import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Room = {
  id: string;
  code: string;
  phase: string;
  round: number;
  timer_ends_at: string | null;
  confidence: number;
  current_suspect: string | null;
  revealed: string[];
  verdict: string | null;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  role: string | null;
  is_host: boolean;
  power_used: boolean;
  created_at: string;
  score: number;
  attempts_used: number;
  status: string;
  evidence_count: number;
  solved_at: string | null;
  finish_seconds: number | null;
  decision: string | null;
  red_herrings: number;
};

export type Vote = {
  id: string;
  room_id: string;
  player_id: string;
  kind: string;
  round: number;
  value: string;
};

const KEY = (code: string) => `wkgl:${code.toUpperCase()}`;

export function storePlayerId(code: string, id: string) {
  try {
    localStorage.setItem(KEY(code), id);
  } catch {
    /* ignore */
  }
}

export function readPlayerId(code: string) {
  try {
    return localStorage.getItem(KEY(code));
  } catch {
    return null;
  }
}

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    const { data: r } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (!r) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setRoom({ ...(r as unknown as Room), revealed: (r.revealed as string[]) ?? [] });
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("players").select("*").eq("room_id", r.id).order("created_at"),
      supabase.from("votes").select("*").eq("room_id", r.id),
    ]);
    setPlayers((p ?? []) as Player[]);
    setVotes((v ?? []) as Vote[]);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!room?.id) return;
    const roomId = room.id;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as unknown as Room;
          if (r?.id) setRoom({ ...r, revealed: (r.revealed as unknown as string[]) ?? [] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        () => {
          void supabase
            .from("players")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at")
            .then(({ data }) => setPlayers((data ?? []) as Player[]));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` },
        () => {
          void supabase
            .from("votes")
            .select("*")
            .eq("room_id", roomId)
            .then(({ data }) => setVotes((data ?? []) as Vote[]));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.id]);

  return { room, players, votes, loading, missing, refresh };
}

export function useCountdown(endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const diff = Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
  return diff;
}

export function tally(votes: Vote[], kind: string, round: number) {
  const out: Record<string, number> = {};
  for (const v of votes) {
    if (v.kind === kind && v.round === round) out[v.value] = (out[v.value] ?? 0) + 1;
  }
  return out;
}

export async function castVote(
  roomId: string,
  playerId: string,
  kind: string,
  round: number,
  value: string,
) {
  await supabase
    .from("votes")
    .upsert({ room_id: roomId, player_id: playerId, kind, round, value }, {
      onConflict: "player_id,kind,round",
    });
}
