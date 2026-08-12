import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { discoveryKey, objectById } from "@/lib/map";

export type Discovery = {
  id: string;
  room_id: string;
  object_id: string;
  step: number;
  player_id: string | null;
  player_name: string | null;
  title: string;
  detail: string;
  severity: string;
  points_to: string | null;
  delta: number;
  created_at: string;
};

export function useDiscoveries(roomId: string | null | undefined) {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("discoveries")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at");
    setDiscoveries((data ?? []) as Discovery[]);
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`disc-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discoveries", filter: `room_id=eq.${roomId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, load]);

  const found = new Set(discoveries.map((d) => discoveryKey(d.object_id, d.step)));
  return { discoveries, found, reload: load };
}

/**
 * Records a discovery once per room. Returns true when this call created it,
 * so the caller knows the confidence delta was applied.
 */
export async function recordDiscovery(
  roomId: string,
  objectId: string,
  step: number,
  player: { id: string; name: string } | null,
) {
  const obj = objectById(objectId);
  const s = obj?.steps[step];
  if (!obj || !s) return false;

  const { data, error } = await supabase
    .from("discoveries")
    .insert({
      room_id: roomId,
      object_id: objectId,
      step,
      player_id: player?.id ?? null,
      player_name: player?.name ?? null,
      title: s.title,
      detail: s.detail,
      severity: s.severity,
      points_to: s.pointsTo,
      delta: s.delta,
    })
    .select()
    .maybeSingle();

  if (error || !data) return false;

  if (s.delta !== 0) {
    const { data: room } = await supabase
      .from("rooms")
      .select("confidence")
      .eq("id", roomId)
      .maybeSingle();
    if (room) {
      await supabase
        .from("rooms")
        .update({ confidence: Math.max(0, Math.min(100, room.confidence + s.delta)) })
        .eq("id", roomId);
    }
  }
  return true;
}
