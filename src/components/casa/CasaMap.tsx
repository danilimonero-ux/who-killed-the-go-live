import { useEffect, useRef, useState } from "react";
import { OBJECTS, WORLD_H, WORLD_W, ZONES } from "@/lib/case";
import type { Investigator } from "@/lib/investigators";

export type MapAvatar = {
  id: string;
  zone: string;
  isMe: boolean;
  inv: Investigator;
};

export function CasaMap({
  found,
  doneActions,
  selected,
  avatars = [],
  myZone,
  onZone,
  onSelect,
}: {
  found: string[];
  doneActions: string[];
  selected: string | null;
  avatars?: MapAvatar[];
  myZone?: string | null;
  onZone?: (zoneId: string) => void;
  onSelect: (id: string | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const s = Math.min(el.clientWidth / WORLD_W, el.clientHeight / WORLD_H);
      setScale(Math.max(0.2, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: WORLD_W,
          height: WORLD_H,
          transform: `translate(-50%,-50%) scale(${scale})`,
        }}
      >
        <div className="absolute -inset-6 rounded-[28px] bg-[#0d1017] shadow-[0_60px_120px_-40px_black]" />
        <div className="absolute inset-0 rounded-2xl border-4 border-[#0b0e14] bg-[#191512] shadow-[0_0_160px_rgba(0,0,0,0.8)_inset]" />

        {ZONES.map((z) => {
          const here = myZone === z.id;
          return (
            <button
              key={z.id}
              onClick={() => onZone?.(z.id)}
              className={`group absolute overflow-hidden rounded-xl border text-left transition ${
                here
                  ? "border-primary/80 shadow-[0_0_0_2px_rgba(255,150,50,0.25),0_0_60px_-10px_rgba(255,150,50,0.7)_inset]"
                  : "border-white/10 hover:border-primary/50"
              }`}
              style={{
                left: z.x + 6,
                top: z.y + 6,
                width: z.w - 12,
                height: z.h - 12,
                background: z.floor,
              }}
            >
              {/* warm interior light + wall shading */}
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 90% at 50% -10%, rgba(255,178,92,0.16), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.05), transparent 30%), linear-gradient(0deg, rgba(0,0,0,0.45), transparent 45%)",
                }}
              />
              <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(90%_70%_at_50%_50%,rgba(255,160,60,0.14),transparent_70%)]" />

              {/* floating dark room label */}
              <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 backdrop-blur">
                <span className="text-[20px] leading-none">{z.icon}</span>
                <span className="leading-tight">
                  <span className="block font-display text-[16px] uppercase tracking-[0.16em] text-white/90">
                    {z.name}
                  </span>
                  <span className="block font-display text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {z.sub}
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        <Props />

        {OBJECTS.map((o) => {
          const explored = o.actions.every((a) => doneActions.includes(a.id));
          const hasEvidence = o.actions.some((a) => a.evidence && found.includes(a.evidence.id));
          const isSel = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={(e) => {
                e.stopPropagation();
                onZone?.(o.zone);
                onSelect(o.id);
              }}
              title={o.name}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 text-center transition hover:-translate-y-[calc(50%+3px)] ${
                isSel
                  ? "border-primary bg-primary/25 shadow-[0_0_28px_rgba(255,120,40,0.5)]"
                  : hasEvidence
                    ? "border-evidence/70 bg-evidence/15"
                    : explored
                      ? "border-white/15 bg-black/40"
                      : "animate-pulse border-primary/50 bg-black/55 hover:border-primary hover:bg-primary/20"
              }`}
              style={{ left: o.x + 32, top: o.y + 32 }}
            >
              <div className="text-[28px] leading-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
                {o.icon}
              </div>
              <div className="mt-1 whitespace-nowrap font-display text-[11px] uppercase tracking-wider text-white/70 group-hover:text-primary">
                {o.name}
              </div>
              {hasEvidence && (
                <div className="absolute -right-2 -top-2 rounded-full bg-evidence px-1.5 text-[10px] font-bold text-black">
                  ✓
                </div>
              )}
            </button>
          );
        })}

        {/* investigator pins */}
        {avatars.map((a, idx) => {
          const z = ZONES.find((zz) => zz.id === a.zone) ?? ZONES[0]!;
          const peers = avatars.filter((p) => p.zone === a.zone);
          const slot = peers.findIndex((p) => p.id === a.id);
          const cx = z.x + z.w / 2 + (slot - (peers.length - 1) / 2) * 96;
          const cy = z.y + z.h - 78;
          return (
            <div
              key={a.id}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
              style={{ left: cx, top: cy, transitionDelay: `${idx * 20}ms` }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`overflow-hidden rounded-full border-[3px] bg-black/70 shadow-[0_10px_24px_-8px_black] ${
                    a.isMe ? "h-[70px] w-[70px] animate-bounce" : "h-[54px] w-[54px]"
                  }`}
                  style={{ borderColor: a.isMe ? "var(--primary)" : a.inv.accent }}
                >
                  <img
                    src={a.inv.portrait}
                    alt={a.inv.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div
                  className="mt-1 whitespace-nowrap rounded-full border border-white/15 bg-black/80 px-2 py-0.5 font-display text-[11px] uppercase tracking-wider"
                  style={{ color: a.isMe ? "var(--primary)" : a.inv.accent }}
                >
                  {a.inv.short}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Props() {
  const tables = [
    [400, 780],
    [600, 780],
    [800, 780],
    [1000, 780],
    [420, 560],
    [1040, 620],
  ];
  return (
    <>
      {tables.map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[26px] opacity-40"
          style={{ left: x, top: y }}
        >
          🪑
        </div>
      ))}
      <div className="pointer-events-none absolute left-[1240px] top-[540px] text-[26px] opacity-40">🍾</div>
      <div className="pointer-events-none absolute left-[1240px] top-[800px] text-[26px] opacity-40">🥃</div>
      <div className="pointer-events-none absolute left-[900px] top-[380px] text-[26px] opacity-40">🍲</div>
      <div className="pointer-events-none absolute left-[1420px] top-[380px] text-[26px] opacity-40">🧂</div>
      <div className="pointer-events-none absolute left-[180px] top-[820px] text-[26px] opacity-40">🪴</div>
      <div className="pointer-events-none absolute left-[1150px] top-[180px] text-[26px] opacity-40">🥬</div>
      <div className="pointer-events-none absolute left-[1480px] top-[180px] text-[26px] opacity-40">🧁</div>
      <div className="pointer-events-none absolute left-[250px] top-[120px] text-[26px] opacity-40">🗄️</div>
    </>
  );
}
