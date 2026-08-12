import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLLIDERS,
  INTERACT_RANGE,
  OBJECTS,
  PLAYER_R,
  PROPS,
  SPAWN,
  WALLS,
  WORLD_H,
  WORLD_W,
  ZONES,
  avatarColor,
  collides,
  discoveryKey,
  objectCenter,
} from "@/lib/map";
import { useMapPresence } from "@/lib/presence";

type Self = { id: string; name: string; role: string | null } | null;

export function MapCanvas({
  roomId,
  self,
  found,
  selectedId,
  onSelect,
  onNearChange,
  frozen = false,
}: {
  roomId: string;
  self: Self;
  found: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNearChange?: (id: string | null) => void;
  frozen?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const selfNode = useRef<HTMLDivElement>(null);
  const peerNodes = useRef(new Map<string, HTMLDivElement | null>());
  const pos = useRef({ ...SPAWN });
  const keys = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number } | null>(null);
  const lastSend = useRef(0);
  const nearRef = useRef<string | null>(null);
  const [scale, setScale] = useState(1);
  const [near, setNear] = useState<string | null>(null);

  const { peers, ids, send } = useMapPresence(roomId, self);

  // scale the fixed world to the container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(Math.max(0.25, w / WORLD_W));
    });
    ro.observe(el);
    setScale(Math.max(0.25, el.clientWidth / WORLD_W));
    return () => ro.disconnect();
  }, []);

  // keyboard
  useEffect(() => {
    if (frozen) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        keys.current.add(k);
        target.current = null;
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      keys.current.clear();
    };
  }, [frozen]);

  const tryMove = useCallback((nx: number, ny: number) => {
    const p = pos.current;
    if (!collides(nx, p.y)) p.x = nx;
    if (!collides(p.x, ny)) p.y = ny;
  }, []);

  // animation loop
  useEffect(() => {
    let raf = 0;
    const SPEED = 4.6;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = pos.current;

      if (!frozen) {
        let dx = 0;
        let dy = 0;
        const k = keys.current;
        if (k.has("a") || k.has("arrowleft")) dx -= 1;
        if (k.has("d") || k.has("arrowright")) dx += 1;
        if (k.has("w") || k.has("arrowup")) dy -= 1;
        if (k.has("s") || k.has("arrowdown")) dy += 1;

        if (dx || dy) {
          const len = Math.hypot(dx, dy) || 1;
          tryMove(p.x + (dx / len) * SPEED * 1.9, p.y + (dy / len) * SPEED * 1.9);
        } else if (target.current) {
          const tdx = target.current.x - p.x;
          const tdy = target.current.y - p.y;
          const d = Math.hypot(tdx, tdy);
          if (d < 6) {
            target.current = null;
          } else {
            const before = { x: p.x, y: p.y };
            tryMove(p.x + (tdx / d) * SPEED * 1.9, p.y + (tdy / d) * SPEED * 1.9);
            if (Math.hypot(p.x - before.x, p.y - before.y) < 0.4) target.current = null;
          }
        }
      }

      if (selfNode.current)
        selfNode.current.style.transform = `translate3d(${p.x - 22}px, ${p.y - 22}px, 0)`;

      // interpolate peers
      for (const [id, peer] of peers.current) {
        peer.rx += (peer.x - peer.rx) * 0.22;
        peer.ry += (peer.y - peer.ry) * 0.22;
        const node = peerNodes.current.get(id);
        if (node) node.style.transform = `translate3d(${peer.rx - 22}px, ${peer.ry - 22}px, 0)`;
      }

      // nearest interactive object
      let best: string | null = null;
      let bestD = INTERACT_RANGE;
      for (const o of OBJECTS) {
        const c = objectCenter(o);
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = o.id;
        }
      }
      if (best !== nearRef.current) {
        nearRef.current = best;
        setNear(best);
        onNearChange?.(best);
      }

      const now = performance.now();
      if (now - lastSend.current > 100) {
        lastSend.current = now;
        send(p.x, p.y);
      }
      return undefined;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frozen, peers, send, tryMove, onNearChange]);

  const walkToward = (o: (typeof OBJECTS)[number]) => {
    const c = objectCenter(o);
    const p = pos.current;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const stop = Math.max(o.w, o.h) / 2 + PLAYER_R + 24;
    target.current = { x: c.x + (dx / d) * stop, y: c.y + (dy / d) * stop };
  };

  const onFloorClick = (e: React.MouseEvent) => {
    if (frozen) return;
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    target.current = { x, y };
  };

  return (
    <div ref={wrapRef} className="w-full select-none">
      <div
        className="relative overflow-hidden rounded-lg border border-border"
        style={{ height: WORLD_H * scale }}
      >
        <div
          ref={worldRef}
          onClick={onFloorClick}
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: WORLD_W, height: WORLD_H, transform: `scale(${scale})` }}
        >
          <FloorPlan />

          {OBJECTS.map((o) => {
            const done = o.steps.every((_, i) => found.has(discoveryKey(o.id, i)));
            const started = o.steps.some((_, i) => found.has(discoveryKey(o.id, i)));
            const isNear = near === o.id;
            const isSel = selectedId === o.id;
            return (
              <button
                key={o.id}
                onClick={(e) => {
                  e.stopPropagation();
                  walkToward(o);
                  onSelect(o.id);
                }}
                style={{ left: o.x, top: o.y, width: o.w, height: o.h }}
                className={`absolute flex flex-col items-center justify-center rounded-md border text-center transition-[box-shadow,border-color,transform] duration-200 ${
                  isSel
                    ? "z-20 scale-105 border-primary bg-primary/25 shadow-[0_0_36px_-6px_var(--ember)]"
                    : isNear
                      ? "z-10 border-primary/80 bg-primary/15 shadow-[0_0_26px_-8px_var(--ember)]"
                      : done
                        ? "border-go/60 bg-go/10"
                        : started
                          ? "border-evidence/60 bg-evidence/10"
                          : "border-border/80 bg-black/35 hover:border-primary/60"
                }`}
              >
                <span style={{ fontSize: Math.min(o.w, o.h) * 0.5, lineHeight: 1 }}>{o.glyph}</span>
                <span
                  className="pointer-events-none absolute -bottom-5 whitespace-nowrap font-display text-[11px] uppercase tracking-wider text-foreground/70"
                  style={{ textShadow: "0 1px 3px black" }}
                >
                  {o.name}
                </span>
                {done && (
                  <span className="pointer-events-none absolute -right-2 -top-2 rounded-full bg-go px-1 text-[10px] font-bold text-black">
                    ✓
                  </span>
                )}
              </button>
            );
          })}

          {ids.map((id) => {
            const p = peers.current.get(id);
            if (!p) return null;
            return (
              <Avatar
                key={id}
                nodeRef={(n) => peerNodes.current.set(id, n)}
                id={id}
                name={p.name}
                dim
              />
            );
          })}

          {self && <Avatar nodeRef={(n) => (selfNode.current = n)} id={self.id} name={self.name} me />}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        WASD / arrows to walk · click the floor to move · click an object to inspect
      </p>
    </div>
  );
}

function Avatar({
  nodeRef,
  id,
  name,
  me = false,
  dim = false,
}: {
  nodeRef: (n: HTMLDivElement | null) => void;
  id: string;
  name: string;
  me?: boolean;
  dim?: boolean;
}) {
  const color = avatarColor(id);
  return (
    <div
      ref={nodeRef}
      className="pointer-events-none absolute left-0 top-0 z-30 h-11 w-11 will-change-transform"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full font-display text-base text-black"
        style={{
          background: color,
          border: me ? "3px solid var(--evidence)" : "2px solid rgba(0,0,0,.5)",
          boxShadow: me ? "0 0 26px -4px var(--ember)" : "0 6px 16px -8px black",
          opacity: dim ? 0.95 : 1,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div
        className="absolute left-1/2 top-11 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white"
        style={{ textShadow: "0 1px 2px black" }}
      >
        {name}
      </div>
    </div>
  );
}

function FloorPlan() {
  return (
    <svg
      width={WORLD_W}
      height={WORLD_H}
      className="absolute inset-0"
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="none" />
          <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="1" />
        </pattern>
        <radialGradient id="vig" cx="50%" cy="45%" r="75%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,.55)" />
        </radialGradient>
      </defs>
      <rect width={WORLD_W} height={WORLD_H} fill="#1d1815" />
      {ZONES.map((z) => (
        <g key={z.id}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.floor} />
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="url(#tiles)" />
          <text
            x={z.x + 18}
            y={z.y + 32}
            fill="rgba(255,255,255,.22)"
            fontFamily="Oswald, sans-serif"
            fontSize="22"
            letterSpacing="4"
          >
            {z.name.toUpperCase()}
          </text>
        </g>
      ))}
      {PROPS.map((p) => (
        <rect
          key={p.id}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          rx={p.kind === "table" || p.kind === "plant" ? Math.min(p.w, p.h) / 2 : 6}
          fill={
            p.kind === "table"
              ? "#5a3d2b"
              : p.kind === "plant"
                ? "#2f4a32"
                : p.kind === "bar"
                  ? "#4a2f22"
                  : "#3c332c"
          }
          stroke="rgba(0,0,0,.45)"
        />
      ))}
      {WALLS.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} fill="#0f0c0a" />
      ))}
      <rect width={WORLD_W} height={WORLD_H} fill="url(#vig)" />
    </svg>
  );
}

export const _colliderCount = COLLIDERS.length;
