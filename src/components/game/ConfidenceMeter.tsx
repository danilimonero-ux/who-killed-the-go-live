import { verdictBand } from "@/lib/game";

const TONE: Record<string, string> = {
  go: "var(--go)",
  warn: "var(--warn)",
  risk: "var(--risk)",
  nogo: "var(--nogo)",
};

export function ConfidenceMeter({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const band = verdictBand(value);
  const color = TONE[band.tone];
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="label-caps">Launch confidence</div>
          <div
            className={`font-display leading-none tabular-nums ${compact ? "text-4xl" : "text-6xl md:text-7xl"}`}
            style={{ color }}
          >
            {value}
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-display uppercase tracking-widest ${compact ? "text-base" : "text-2xl"}`}
            style={{ color }}
          >
            {band.label}
          </div>
          {!compact && <div className="text-xs text-muted-foreground">{band.note}</div>}
        </div>
      </div>
      <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 24px -4px ${color}` }}
        />
        {[40, 60, 80].map((m) => (
          <div
            key={m}
            className="absolute top-0 h-full w-px bg-background/70"
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
          <span>NO-GO</span>
          <span>HIGH RISK</span>
          <span>CONDITIONAL</span>
          <span>GO</span>
        </div>
      )}
    </div>
  );
}
