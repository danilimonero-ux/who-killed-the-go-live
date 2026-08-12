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
  routeWaypoints,
  zoneAt,
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
  onZoneChange,
  frozen = false,
  fit = false,
}: {
  roomId: string;
  self: Self;
  found: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNearChange?: (id: string | null) => void;
  onZoneChange?: (zone: string) => void;
  frozen?: boolean;
  /** fill the parent box (letterboxed) instead of scaling to width */
  fit?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const selfNode = useRef<HTMLDivElement>(null);
  const peerNodes = useRef(new Map<string, HTMLDivElement | null>());
  const pos = useRef({ ...SPAWN });
  const keys = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number } | null>(null);
  const path = useRef<{ x: number; y: number }[]>([]);
  const lastSend = useRef(0);
  const nearRef = useRef<string | null>(null);
  const zoneRef = useRef<string | null>(null);
  const [scale, setScale] = useState(1);
  const [near, setNear] = useState<string | null>(null);

  const { peers, ids, send } = useMapPresence(roomId, self);

  // scale the fixed world to the container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = fit && h > 0 ? Math.min(w / WORLD_W, h / WORLD_H) : w / WORLD_W;
      setScale(Math.max(0.2, s));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [fit]);


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
        path.current = [];
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
          if (d < 10) {
            target.current = path.current.shift() ?? null;
          } else {
            const before = { x: p.x, y: p.y };
            tryMove(p.x + (tdx / d) * SPEED * 1.9, p.y + (tdy / d) * SPEED * 1.9);
            if (Math.hypot(p.x - before.x, p.y - before.y) < 0.4) {
              // slide around the obstacle instead of giving up
              const perp = [
                { x: -tdy / d, y: tdx / d },
                { x: tdy / d, y: -tdx / d },
              ];
              let moved = false;
              for (const v of perp) {
                const b2 = { x: p.x, y: p.y };
                tryMove(p.x + v.x * SPEED * 2.2, p.y + v.y * SPEED * 2.2);
                if (Math.hypot(p.x - b2.x, p.y - b2.y) > 0.4) {
                  moved = true;
                  break;
                }
              }
              if (!moved) target.current = path.current.shift() ?? null;
            }
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

      const z = zoneAt(p.x, p.y);
      if (z !== zoneRef.current) {
        zoneRef.current = z;
        onZoneChange?.(z);
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
  }, [frozen, peers, send, tryMove, onNearChange, onZoneChange]);

  const goTo = (dest: { x: number; y: number }) => {
    const way = routeWaypoints(pos.current, dest);
    path.current = [...way.slice(1), dest];
    target.current = way[0] ?? dest;
  };

  const walkToward = (o: (typeof OBJECTS)[number]) => {
    const c = objectCenter(o);
    const p = pos.current;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const stop = Math.max(o.w, o.h) / 2 + PLAYER_R + 24;
    goTo({ x: c.x + (dx / d) * stop, y: c.y + (dy / d) * stop });
  };

  const onFloorClick = (e: React.MouseEvent) => {
    if (frozen) return;
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    goTo({ x, y });
  };

  return (
    <div
      ref={wrapRef}
      className={`select-none ${fit ? "flex h-full w-full items-center justify-center" : "w-full"}`}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-border/80 shadow-[0_30px_90px_-40px_black]"
        style={{ height: WORLD_H * scale, width: WORLD_W * scale }}
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
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-[11px] uppercase tracking-wider text-white/70 backdrop-blur">
          WASD / arrows to walk · click floor to move · click an object to inspect
        </p>
      </div>
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
      {/* rugs */}
      <rect x={140} y={430} width={860} height={420} rx={26} fill="rgba(120,60,35,.16)" />

      {PROPS.map((p) => {
        if (p.kind === "table") {
          const cx = p.x + p.w / 2;
          const cy = p.y + p.h / 2;
          const r = Math.min(p.w, p.h) / 2;
          return (
            <g key={p.id}>
              {[
                [cx, cy - r - 14],
                [cx, cy + r + 14],
                [cx - r - 14, cy],
                [cx + r + 14, cy],
              ].map(([x, y], i) => (
                <rect
                  key={i}
                  x={(x as number) - 11}
                  y={(y as number) - 11}
                  width={22}
                  height={22}
                  rx={5}
                  fill="#4a3527"
                  stroke="rgba(0,0,0,.5)"
                />
              ))}
              <circle cx={cx} cy={cy + 4} r={r} fill="rgba(0,0,0,.35)" />
              <circle cx={cx} cy={cy} r={r} fill="#6b4630" stroke="rgba(0,0,0,.5)" />
              <circle cx={cx} cy={cy} r={r * 0.55} fill="rgba(255,220,180,.07)" />
              <circle cx={cx} cy={cy} r={5} fill="#e8a24a" opacity={0.8} />
            </g>
          );
        }
        if (p.kind === "plant") {
          const cx = p.x + p.w / 2;
          const cy = p.y + p.h / 2;
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={p.w / 2} fill="#3d2b20" />
              <circle cx={cx} cy={cy - 4} r={p.w / 2 - 5} fill="#2f5a35" />
              <circle cx={cx - 8} cy={cy + 2} r={9} fill="#3a6b3c" />
              <circle cx={cx + 8} cy={cy + 4} r={8} fill="#2b5230" />
            </g>
          );
        }
        const isBar = p.kind === "bar";
        return (
          <g key={p.id}>
            <rect
              x={p.x}
              y={p.y + 5}
              width={p.w}
              height={p.h}
              rx={7}
              fill="rgba(0,0,0,.4)"
            />
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={7}
              fill={isBar ? "#5b3826" : p.kind === "line" ? "#4a4740" : "#443a31"}
              stroke="rgba(0,0,0,.5)"
            />
            <rect
              x={p.x + 4}
              y={p.y + 4}
              width={p.w - 8}
              height={Math.max(6, p.h * 0.22)}
              rx={4}
              fill="rgba(255,255,255,.08)"
            />
            {p.kind === "line" &&
              Array.from({ length: Math.floor(p.w / 90) }).map((_, i) => (
                <circle
                  key={i}
                  cx={p.x + 45 + i * 90}
                  cy={p.y + p.h / 2}
                  r={13}
                  fill="#2a2724"
                  stroke="rgba(255,140,60,.5)"
                />
              ))}
            {isBar &&
              Array.from({ length: Math.floor(p.w / 80) }).map((_, i) => (
                <circle
                  key={i}
                  cx={p.x + 40 + i * 80}
                  cy={p.y + p.h + 30}
                  r={13}
                  fill="#4a3527"
                  stroke="rgba(0,0,0,.5)"
                />
              ))}
          </g>
        );
      })}

      {WALLS.map((w, i) => (
        <g key={i}>
          <rect x={w.x} y={w.y} width={w.w} height={w.h} fill="#0d0a09" />
          <rect
            x={w.x}
            y={w.y}
            width={w.w}
            height={Math.min(4, w.h)}
            fill="rgba(255,255,255,.07)"
          />
        </g>
      ))}

      {/* doorways */}
      {[
        { x: 200, y: 354, w: 100, h: 12 },
        { x: 700, y: 354, w: 100, h: 12 },
        { x: 514, y: 150, w: 12, h: 100 },
        { x: 1062, y: 500, w: 12, h: 120 },
        { x: 1380, y: 334, w: 100, h: 12 },
      ].map((d, i) => (
        <rect
          key={i}
          x={d.x}
          y={d.y}
          width={d.w}
          height={d.h}
          fill="rgba(232,162,74,.45)"
          rx={4}
        />
      ))}

      <rect width={WORLD_W} height={WORLD_H} fill="url(#vig)" />

    </svg>
  );
}

export const _colliderCount = COLLIDERS.length;
