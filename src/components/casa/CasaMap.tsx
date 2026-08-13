import { useEffect, useRef, useState } from "react";
import { OBJECTS, WORLD_H, WORLD_W, ZONES } from "@/lib/case";

export function CasaMap({
  found,
  doneActions,
  selected,
  onSelect,
}: {
  found: string[];
  doneActions: string[];
  selected: string | null;
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
        <div className="absolute inset-0 rounded-xl border border-border/70 bg-[#191512] shadow-[0_0_120px_rgba(0,0,0,0.7)_inset]" />

        {ZONES.map((z) => (
          <div
            key={z.id}
            className="absolute rounded-lg border border-white/10"
            style={{ left: z.x + 6, top: z.y + 6, width: z.w - 12, height: z.h - 12, background: z.floor }}
          >
            <div className="pointer-events-none absolute left-3 top-2 font-display text-[15px] uppercase tracking-[0.18em] text-white/35">
              {z.icon} {z.name}
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]" />
          </div>
        ))}

        {/* decorative props */}
        <Props />

        {OBJECTS.map((o) => {
          const explored = o.actions.every((a) => doneActions.includes(a.id));
          const hasEvidence = o.actions.some((a) => a.evidence && found.includes(a.evidence.id));
          const isSel = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              title={o.name}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 text-center transition ${
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
              <div className="text-[28px] leading-none">{o.icon}</div>
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
