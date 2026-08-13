import { useEffect, useRef, useState } from "react";
import { OBJECTS, WORLD_H, WORLD_W, ZONES } from "@/lib/case";
import type { Investigator } from "@/lib/investigators";

export type MapAvatar = {
  id: string;
  zone: string;
  isMe: boolean;
  inv: Investigator;
};

/* ── isometric projection (pure 2D matrices, no preserve-3d) ── */
const ROT_Z = 40;
const TILT = 54;
const WALL = 86;

const rad = (d: number) => (d * Math.PI) / 180;
const CZ = Math.cos(rad(ROT_Z));
const SZ = Math.sin(rad(ROT_Z));
const CX = Math.cos(rad(TILT));
const SX = Math.sin(rad(TILT));

/** world point → screen point (before origin shift) */
const px = (x: number, y: number) => x * CZ + y * SZ;
const py = (x: number, y: number) => -x * SZ * CX + y * CZ * CX;

const CORNERS = [
  [0, 0],
  [WORLD_W, 0],
  [0, WORLD_H],
  [WORLD_W, WORLD_H],
] as const;
const XS = CORNERS.map(([x, y]) => px(x, y));
const YS = CORNERS.map(([x, y]) => py(x, y));
const MIN_X = Math.min(...XS) - 90;
const MIN_Y = Math.min(...YS) - WALL * SX - 120;
const BOARD_W = Math.max(...XS) - Math.min(...XS) + 180;
const BOARD_H = Math.max(...YS) - Math.min(...YS) + WALL * SX + 200;

/** screen coordinates inside the board, optionally lifted `h` world units */
const at = (x: number, y: number, h = 0) => ({
  left: px(x, y) - MIN_X,
  top: py(x, y) - MIN_Y - h * SX,
});

const FLOOR_MATRIX = `matrix(${CZ}, ${-SZ * CX}, ${SZ}, ${CZ * CX}, 0, 0)`;

/* ── furniture, in world coordinates ───────────────────────── */
type Prop = { x: number; y: number; icon: string; s?: number; o?: number };
const FURNITURE: Prop[] = [
  { x: 130, y: 170, icon: "🗄️", s: 34 },
  { x: 255, y: 205, icon: "🪴", s: 30 },
  { x: 120, y: 400, icon: "🧰", s: 26 },
  { x: 255, y: 395, icon: "🪑", s: 24 },
  { x: 430, y: 130, icon: "🪑", s: 24 },
  { x: 715, y: 130, icon: "📚", s: 28 },
  { x: 420, y: 425, icon: "🗃️", s: 28 },
  { x: 715, y: 420, icon: "🪴", s: 30 },
  { x: 1030, y: 130, icon: "🔥", s: 26 },
  { x: 1030, y: 235, icon: "🍳", s: 26 },
  { x: 800, y: 245, icon: "🧑‍🍳", s: 26, o: 0.55 },
  { x: 1120, y: 235, icon: "🥬", s: 26 },
  { x: 1330, y: 95, icon: "🧊", s: 26 },
  { x: 1520, y: 170, icon: "🧁", s: 26 },
  { x: 1410, y: 245, icon: "🍰", s: 24 },
  { x: 990, y: 425, icon: "🍲", s: 26 },
  { x: 1330, y: 425, icon: "🧂", s: 24 },
  { x: 1500, y: 350, icon: "🧑‍🍳", s: 26, o: 0.55 },
  { x: 195, y: 545, icon: "🛎️", s: 26 },
  { x: 90, y: 840, icon: "🪴", s: 32 },
  { x: 250, y: 830, icon: "🧳", s: 26 },
  { x: 420, y: 790, icon: "🪑", s: 30 },
  { x: 640, y: 840, icon: "🪑", s: 30 },
  { x: 780, y: 770, icon: "🪑", s: 30 },
  { x: 1090, y: 810, icon: "🪑", s: 30 },
  { x: 380, y: 560, icon: "🕯️", s: 24 },
  { x: 1130, y: 560, icon: "🪴", s: 32 },
  { x: 660, y: 545, icon: "🍽️", s: 26, o: 0.6 },
  { x: 1220, y: 545, icon: "🍾", s: 28 },
  { x: 1390, y: 545, icon: "🥃", s: 26 },
  { x: 1250, y: 840, icon: "🍸", s: 26 },
  { x: 1530, y: 840, icon: "📦", s: 28 },
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
      const s = Math.min(el.clientWidth / BOARD_W, el.clientHeight / BOARD_H) * 0.99;
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
      className="relative h-full w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_95%_at_50%_15%,#161d2a,#070910_75%)]"
    >
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ width: BOARD_W, height: BOARD_H, transform: `translate(-50%,-50%) scale(${scale})` }}
      >
        {/* building plinth */}
        <div
          className="absolute rounded-[26px]"
          style={{
            ...at(-34, -34),
            width: WORLD_W + 68,
            height: WORLD_H + 68,
            transform: `${FLOOR_MATRIX}`,
            transformOrigin: "0 0",
            background: "linear-gradient(140deg,#1d2431,#0c1017)",
            boxShadow: "0 0 220px 70px rgba(0,0,0,0.9)",
          }}
        />

        {ZONES.map((z) => {
          const here = myZone === z.id;
          return (
            <div key={z.id}>
              {/* floor */}
              <button
                onClick={() => onZone?.(z.id)}
                disabled={readOnly}
                className="absolute overflow-hidden transition"
                style={{
                  ...at(z.x + 3, z.y + 3),
                  width: z.w - 6,
                  height: z.h - 6,
                  transform: FLOOR_MATRIX,
                  transformOrigin: "0 0",
                  background: `linear-gradient(150deg, color-mix(in oklab, ${z.floor} 78%, #ffb45c 22%), ${z.floor})`,
                  boxShadow: here
                    ? "inset 0 0 0 4px rgba(255,160,60,0.7), inset 0 0 140px rgba(255,170,80,0.35)"
                    : "inset 0 0 0 2px rgba(0,0,0,0.5), inset 0 0 120px rgba(255,150,60,0.13)",
                  cursor: readOnly ? "default" : "pointer",
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 54px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 54px)",
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(65% 55% at 50% 45%, rgba(255,186,110,0.26), transparent 72%)",
                  }}
                />
              </button>

              <Wall x={z.x} y={z.y} len={z.w} axis="x" />
              <Wall x={z.x} y={z.y} len={z.h} axis="y" />
            </div>
          );
        })}

        {/* furniture */}
        {FURNITURE.map((p, i) => (
          <div
            key={i}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              ...at(p.x, p.y, 12),
              fontSize: p.s ?? 26,
              opacity: p.o ?? 0.8,
              filter: "drop-shadow(0 8px 6px rgba(0,0,0,0.6))",
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
              className="group absolute z-20 -translate-x-1/2 -translate-y-full"
              style={at(o.x + 32, o.y + 32, 20)}
            >
              <span className="flex flex-col items-center">
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-xl border text-[24px] leading-none transition ${
                    isSel
                      ? "border-primary bg-primary/25 shadow-[0_0_32px_rgba(255,130,40,0.7)]"
                      : hasEvidence
                        ? "border-evidence/70 bg-evidence/15"
                        : explored
                          ? "border-white/12 bg-black/45"
                          : "border-primary/30 bg-black/45 shadow-[0_0_18px_rgba(255,150,60,0.22)] group-hover:border-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_34px_rgba(255,150,60,0.65)]"
                  }`}
                >
                  {o.icon}
                  {!explored && !isSel && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-primary/70" />
                  )}
                  {hasEvidence && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-evidence px-1.5 text-[10px] font-bold text-black">
                      ✓
                    </span>
                  )}
                </span>
                <span className="pointer-events-none mt-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-[0.14em] text-primary opacity-0 transition group-hover:opacity-100">
                  {o.name}
                </span>
              </span>
            </button>
          );
        })}

        {/* room labels, above the walls */}
        {ZONES.map((z) => (
          <div
            key={`lbl-${z.id}`}
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
            style={at(z.x + z.w / 2, z.y + 18, WALL + 46)}
          >
            <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/12 bg-[#080b12]/90 px-3 py-1.5 shadow-[0_14px_30px_-12px_black] backdrop-blur">
              <span className="text-[17px] leading-none">{z.icon}</span>
              <span className="leading-tight">
                <span className="block font-display text-[13px] uppercase tracking-[0.2em] text-white/90">
                  {z.name}
                </span>
                <span className="block font-display text-[9px] uppercase tracking-[0.22em] text-primary/70">
                  {z.sub}
                </span>
              </span>
            </div>
          </div>
        ))}

        {/* investigator standees */}
        {avatars.map((a, idx) => {
          const z = ZONES.find((zz) => zz.id === a.zone) ?? ZONES[0]!;
          const peers = avatars.filter((p) => p.zone === a.zone);
          const slot = peers.findIndex((p) => p.id === a.id);
          const wx = z.x + z.w / 2 + (slot - (peers.length - 1) / 2) * Math.min(120, z.w / 3.2);
          const wy = z.y + z.h - 70;
          const ground = at(wx, wy);
          return (
            <div
              key={a.id}
              className="pointer-events-none absolute z-40 transition-all duration-[900ms] ease-out"
              style={{ ...ground, transitionDelay: `${idx * 30}ms` }}
            >
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/60 blur-[4px]"
                style={{ width: 76, height: 30 }}
              />
              <div className="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center">
                <div
                  className="mb-0.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-display text-[11px] uppercase tracking-wider"
                  style={{
                    color: a.isMe ? "var(--primary)" : a.inv.accent,
                    borderColor: a.isMe ? "var(--primary)" : a.inv.accent,
                    background: "rgba(6,8,12,0.88)",
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
                  className={a.isMe ? "h-[140px] w-auto" : "h-[118px] w-auto"}
                  style={{
                    filter: `drop-shadow(0 12px 12px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${
                      a.isMe ? "rgba(255,150,60,0.6)" : "transparent"
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
  const dir = axis === "x" ? { a: CZ, b: -SZ * CX } : { a: SZ, b: CZ * CX };
  const p = at(x, y, WALL);
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: p.left,
        top: p.top,
        width: len,
        height: WALL,
        transform: `matrix(${dir.a}, ${dir.b}, 0, ${SX}, 0, 0)`,
        transformOrigin: "0 0",
        background:
          axis === "x"
            ? "linear-gradient(180deg,#413628,#241d16)"
            : "linear-gradient(180deg,#332a20,#191410)",
        borderTop: "2px solid rgba(255,196,128,0.22)",
        boxShadow: "inset 0 -30px 40px -20px rgba(0,0,0,0.8)",
      }}
    />
  );
}
