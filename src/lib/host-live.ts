import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccusationRow = {
  id: string;
  room_id: string;
  player_id: string | null;
  player_name: string;
  role: string | null;
  attempt: number;
  what: string | null;
  root: string | null;
  killer: string | null;
  weapon: string | null;
  decision: string | null;
  correct: boolean;
  created_at: string;
};

export type GameEventRow = {
  id: string;
  room_id: string;
  player_id: string | null;
  player_name: string | null;
  role: string | null;
  kind: string;
  message: string;
  created_at: string;
};

/** Fire-and-forget activity log used by the Game Master feed. */
export function logEvent(e: {
  room_id: string;
  player_id?: string | null;
  player_name?: string | null;
  role?: string | null;
  kind: string;
  message: string;
}) {
  void supabase
    .from("game_events")
    .insert(e)
    .then(({ error }) => {
      if (error) console.warn("[events]", error.message);
    });
}

/** Host-only live stream of accusations + activity events for a room. */
export function useHostLive(roomId: string | null | undefined) {
  const [accusations, setAccusations] = useState<AccusationRow[]>([]);
  const [events, setEvents] = useState<GameEventRow[]>([]);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    const [{ data: a }, { data: e }] = await Promise.all([
      supabase
        .from("accusations")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false }),
      supabase
        .from("game_events")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);
    setAccusations((a ?? []) as AccusationRow[]);
    setEvents((e ?? []) as GameEventRow[]);
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`host-live-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "accusations", filter: `room_id=eq.${roomId}` },
        (payload) => setAccusations((s) => [payload.new as AccusationRow, ...s]),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_events", filter: `room_id=eq.${roomId}` },
        (payload) => setEvents((s) => [payload.new as GameEventRow, ...s].slice(0, 120)),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { accusations, events, refresh };
}
