import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Peer = {
  id: string;
  name: string;
  role: string | null;
  /** last received position */
  x: number;
  y: number;
  /** interpolated render position */
  rx: number;
  ry: number;
  last: number;
};

/**
 * Lightweight avatar sync: positions travel over a Supabase Realtime broadcast
 * channel (~10/s) and are never written to Postgres.
 */
export function useMapPresence(
  roomId: string | null | undefined,
  self: { id: string; name: string; role: string | null } | null,
) {
  const peers = useRef(new Map<string, Peer>());
  const [ids, setIds] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`map-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const p = payload as { id: string; name: string; role: string | null; x: number; y: number };
        if (!p?.id || p.id === self?.id) return;
        const existing = peers.current.get(p.id);
        if (existing) {
          existing.x = p.x;
          existing.y = p.y;
          existing.name = p.name;
          existing.role = p.role;
          existing.last = Date.now();
        } else {
          peers.current.set(p.id, {
            ...p,
            rx: p.x,
            ry: p.y,
            last: Date.now(),
          });
          setIds(Array.from(peers.current.keys()));
        }
      })
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        const id = (payload as { id: string })?.id;
        if (id && peers.current.delete(id)) setIds(Array.from(peers.current.keys()));
      })
      .subscribe((status) => {
        ready.current = status === "SUBSCRIBED";
      });

    channelRef.current = channel;

    const prune = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, p] of peers.current) {
        if (now - p.last > 10000) {
          peers.current.delete(id);
          changed = true;
        }
      }
      if (changed) setIds(Array.from(peers.current.keys()));
    }, 3000);

    return () => {
      clearInterval(prune);
      if (self?.id) void channel.send({ type: "broadcast", event: "bye", payload: { id: self.id } });
      ready.current = false;
      channelRef.current = null;
      peers.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [roomId, self?.id]);

  const send = useCallback(
    (x: number, y: number) => {
      const ch = channelRef.current;
      if (!ch || !ready.current || !self) return;
      void ch.send({
        type: "broadcast",
        event: "pos",
        payload: { id: self.id, name: self.name, role: self.role, x: Math.round(x), y: Math.round(y) },
      });
    },
    [self?.id, self?.name, self?.role],
  );

  return { peers, ids, send };
}
