import { useEffect, useRef, useState } from "react";
import { OBJECTS, WORLD_H, WORLD_W, ZONES } from "@/lib/case";
import type { Investigator } from "@/lib/investigators";

export type MapAvatar = {
  id: string;
  zone: string;
  isMe: boolean;
  inv: Investigator;
};

/* ── isometric projection helpers ──────────────────────────── */
const ROT_Z = 40; // deg
const ROT_X = 54; // deg
const WALL = 78; // wall height in world units

const rad = (d: number) => (d * Math.PI) / 180;

function projectedSize() {
  const cz = Math.cos(rad(ROT_Z));
  const sz = Math.sin(rad(ROT_Z));
  const cx = Math.cos(rad(ROT_X));
  const pts = [
    [0, 0],
    [WORLD_W, 0],
    [0, WORLD_H],
    [WORLD_W, WORLD_H],
  ].map(([x, y]) => [x! * cz + y! * sz, (-x! * sz + y! * cz) * cx]);
  const xs = pts.map((p) => p[0]!);
  const ys = pts.map((p) => p[1]!);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys) + WALL * Math.sin(rad(ROT_X)),
  };
}
const PROJ = projectedSize();

/** children of the tilted board that must face the camera */
const BILLBOARD = `rotateZ(${ROT_Z}deg) rotateX(${-ROT_X}deg)`;

/* ── room furniture, expressed in world coordinates ────────── */
type Prop = { x: number; y: number; icon: string; s?: number; o?: number };

const FURNITURE: Prop[] = [
  // terrace / network room
  { x: 130, y: 170, icon: "🗄️", s: 34 },
  { x: 250, y: 200, icon: "🪴", s: 30 },
  { x: 120, y: 400, icon: "🧰", s: 26 },
  { x: 250, y: 380, icon: "🪑", s: 24 },
  // office
  { x: 430, y: 130, icon: "🪑", s: 24 },
  { x: 700, y: 130, icon: "📚", s: 28 },
  { x: 420, y: 420, icon: "🗃️", s: 28 },
  { x: 700, y: 420, icon: "🪴", s: 30 },
  // hot kitchen
  { x: 1010, y: 120, icon: "🔥", s: 26 },
  { x: 1010, y: 230, icon: "🍳", s: 26 },
  { x: 800, y: 240, icon: "🧑‍🍳", s: 26, o: 0.5 },
  // cold kitchen
  { x: 1120, y: 230, icon: "🥬", s: 26 },
  { x: 1330, y: 90, icon: "🧊", s: 26 },
  // desserts
  { x: 1500, y: 170, icon: "🧁", s: 26 },
  { x: 1400, y: 240, icon: "🍰", s: 24 },
  // pass
  { x: 990, y: 420, icon: "🍲", s: 26 },
  { x: 1330, y: 420, icon: "🧂", s: 24 },
  { x: 1470, y: 350, icon: "🧑‍🍳", s: 26, o: 0.5 },
  // reception
  { x: 190, y: 540, icon: "🛎️", s: 26 },
  { x: 90, y: 830, icon: "🪴", s: 32 },
  { x: 240, y: 820, icon: "🧳", s: 26 },
  // dining room
  { x: 420, y: 780, icon: "🪑", s: 30 },
  { x: 620, y: 830, icon: "🪑", s: 30 },
  { x: 760, y: 760, icon: "🪑", s: 30 },
  { x: 1080, y: 800, icon: "🪑", s: 30 },
  { x: 380, y: 560, icon: "🕯️", s: 24 },
  { x: 1120, y: 560, icon: "🪴", s: 32 },
  { x: 660, y: 540, icon: "🍽️", s: 26, o: 0.5 },
  // bar
  { x: 1220, y: 540, icon: "🍾", s: 28 },
  { x: 1380, y: 540, icon: "🥃", s: 26 },
  { x: 1240, y: 830, icon: "🍸", s: 26 },
  // storage / pos1
  { x: 1520, y: 830, icon: "📦", s: 28 },
];

export function CasaMap({
  found,
  doneActions,
  selected,
  avatars = [],
  myZone,
  onZone,
  onSelect,
  readOnly = false,
}: {
  found: string[];
  doneActions: string[];
  selected: string | null;
  avatars?: MapAvatar[];
  myZone?: string | null;
  onZone?: (zoneId: string) => void;
  onSelect: (id: string | null) => void;
  readOnly?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const s = Math.min(el.clientWidth / PROJ.w, el.clientHeight / PROJ.h) * 0.96;
      setScale(Math.max(0.18, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrap}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_20%,#151b26,#080a10_70%)]"
      style={{ perspective: "2600px" }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: WORLD_W,
          height: WORLD_H,
          transformStyle: "preserve-3d",
          transform: `translate(-50%,-50%) scale(${scale}) rotateX(${ROT_X}deg) rotateZ(${-ROT_Z}deg)`,
        }}
      >
        {/* ground slab */}
        <div
          className="absolute rounded-[18px]"
          style={{
            left: -70,
            top: -70,
            width: WORLD_W + 140,
            height: WORLD_H + 140,
            transform: "translateZ(-18px)",
            background: "linear-gradient(140deg,#1a1f2b,#0d1017)",
            boxShadow: "0 0 200px 60px rgba(0,0,0,0.85)",
          }}
        />

        {ZONES.map((z) => {
          const here = myZone === z.id;
          return (
            <div key={z.id} style={{ transformStyle: "preserve-3d" }}>
              {/* floor */}
              <button
                onClick={() => onZone?.(z.id)}
                disabled={readOnly}
                className="absolute overflow-hidden transition"
                style={{
                  left: z.x + 4,
                  top: z.y + 4,
                  width: z.w - 8,
                  height: z.h - 8,
                  background: `linear-gradient(150deg, color-mix(in oklab, ${z.floor} 82%, #ffb45c 18%), ${z.floor})`,
                  boxShadow: here
                    ? "inset 0 0 0 3px rgba(255,160,60,0.65), inset 0 0 120px rgba(255,170,80,0.35)"
                    : "inset 0 0 0 2px rgba(0,0,0,0.55), inset 0 0 110px rgba(255,150,60,0.14)",
                  cursor: readOnly ? "default" : "pointer",
                }}
              >
                {/* tile pattern + warm pool of light */}
                <span
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 56px)",
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(70% 55% at 50% 45%, rgba(255,183,102,0.22), transparent 70%)",
                  }}
                />
              </button>

              {/* north wall */}
              <Wall x={z.x} y={z.y} len={z.w} axis="x" />
              {/* west wall */}
              <Wall x={z.x} y={z.y} len={z.h} axis="y" />

              {/* floating label */}
              <div
                className="pointer-events-none absolute z-30"
                style={{
                  left: z.x + z.w / 2,
                  top: z.y + 26,
                  transform: `translate(-50%,-50%) translateZ(${WALL + 34}px) ${BILLBOARD}`,
                }}
              >
                <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/12 bg-[#0b0e14]/85 px-3 py-1.5 shadow-[0_10px_26px_-10px_black] backdrop-blur">
                  <span className="text-[18px] leading-none">{z.icon}</span>
                  <span className="leading-tight">
                    <span className="block font-display text-[14px] uppercase tracking-[0.18em] text-white/90">
                      {z.name}
                    </span>
                    <span className="block font-display text-[9px] uppercase tracking-[0.22em] text-primary/70">
                      {z.sub}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* furniture */}
        {FURNITURE.map((p, i) => (
          <div
            key={i}
            className="pointer-events-none absolute z-10"
            style={{
              left: p.x,
              top: p.y,
              fontSize: p.s ?? 26,
              opacity: p.o ?? 0.75,
              transform: `translate(-50%,-50%) translateZ(16px) ${BILLBOARD}`,
              filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.6))",
            }}
          >
            {p.icon}
          </div>
        ))}

        {/* clickable evidence props */}
        {OBJECTS.map((o) => {
          const explored = o.actions.every((a) => doneActions.includes(a.id));
          const hasEvidence = o.actions.some((a) => a.evidence && found.includes(a.evidence.id));
          const isSel = selected === o.id;
          return (
            <button
              key={o.id}
              disabled={readOnly}
              onClick={(e) => {
                e.stopPropagation();
                if (readOnly) return;
                onZone?.(o.zone);
                onSelect(o.id);
              }}
              title={o.name}
              className="group absolute z-20"
              style={{
                left: o.x + 32,
                top: o.y + 32,
                transform: `translate(-50%,-50%) translateZ(26px) ${BILLBOARD}`,
              }}
            >
              <span className="flex flex-col items-center">
                <span
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl border text-[24px] leading-none transition ${
                    isSel
                      ? "border-primary bg-primary/25 shadow-[0_0_30px_rgba(255,130,40,0.65)]"
                      : hasEvidence
                        ? "border-evidence/70 bg-evidence/15"
                        : explored
                          ? "border-white/12 bg-black/45"
                          : "border-primary/35 bg-black/45 shadow-[0_0_18px_rgba(255,150,60,0.25)] group-hover:border-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_30px_rgba(255,150,60,0.6)]"
                  }`}
                >
                  {o.icon}
                  {!explored && !isSel && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-primary/80" />
                  )}
                  {hasEvidence && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-evidence px-1.5 text-[10px] font-bold text-black">
                      ✓
                    </span>
                  )}
                </span>
                <span className="mt-1 whitespace-nowrap font-display text-[9px] uppercase tracking-[0.14em] text-white/45 opacity-0 transition group-hover:text-primary group-hover:opacity-100">
                  {o.name}
                </span>
              </span>
            </button>
          );
        })}

        {/* investigator standees */}
        {avatars.map((a, idx) => {
          const z = ZONES.find((zz) => zz.id === a.zone) ?? ZONES[0]!;
          const peers = avatars.filter((p) => p.zone === a.zone);
          const slot = peers.findIndex((p) => p.id === a.id);
          const cx = z.x + z.w / 2 + (slot - (peers.length - 1) / 2) * Math.min(110, z.w / 3);
          const cy = z.y + z.h - 70;
          return (
            <div
              key={a.id}
              className="pointer-events-none absolute z-40 transition-all duration-[900ms] ease-out"
              style={{ left: cx, top: cy, transitionDelay: `${idx * 30}ms` }}
            >
              {/* ground shadow stays flat on the floor */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/55 blur-[3px]"
                style={{ width: 74, height: 34 }}
              />
              <div
                className="absolute flex flex-col items-center"
                style={{
                  transform: `translate(-50%,-100%) translateZ(4px) ${BILLBOARD}`,
                  transformOrigin: "bottom center",
                }}
              >
                <div
                  className="whitespace-nowrap rounded-full border px-2 py-0.5 font-display text-[10px] uppercase tracking-wider"
                  style={{
                    color: a.isMe ? "var(--primary)" : a.inv.accent,
                    borderColor: a.isMe ? "var(--primary)" : a.inv.accent,
                    background: "rgba(6,8,12,0.85)",
                  }}
                >
                  {a.inv.short}
                </div>
                <img
                  src={a.inv.portrait}
                  alt={a.inv.name}
                  loading="lazy"
                  width={768}
                  height={1024}
                  className={a.isMe ? "h-[132px] w-auto" : "h-[112px] w-auto"}
                  style={{
                    filter: `drop-shadow(0 10px 12px rgba(0,0,0,0.75)) drop-shadow(0 0 10px ${
                      a.isMe ? "rgba(255,150,60,0.55)" : "transparent"
                    })`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Wall({ x, y, len, axis }: { x: number; y: number; len: number; axis: "x" | "y" }) {
  const bg =
    axis === "x"
      ? "linear-gradient(180deg,#3b3229,#231c16)"
      : "linear-gradient(180deg,#2f271f,#1a1510)";
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: len,
        height: WALL,
        background: bg,
        borderTop: "2px solid rgba(255,190,120,0.18)",
        transformOrigin: "top left",
        transform: axis === "x" ? "rotateX(-90deg)" : "rotateZ(90deg) rotateX(-90deg)",
        boxShadow: "0 2px 14px rgba(0,0,0,0.55)",
      }}
    />
  );
}
