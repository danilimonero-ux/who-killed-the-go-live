import { useCountdown } from "@/lib/room";

export function Timer({ endsAt, total }: { endsAt: string | null; total: number }) {
  const left = useCountdown(endsAt);
  if (left === null)
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl tabular-nums text-muted-foreground">--:--</span>
      </div>
    );
  const mm = Math.floor(left / 60);
  const ss = left % 60;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const urgent = left <= 10 && left > 0;
  return (
    <div className="w-full">
      <div
        className={`font-display text-5xl leading-none tabular-nums md:text-6xl ${
          urgent ? "animate-pulse text-destructive" : "text-foreground"
        }`}
      >
        {mm}:{String(ss).padStart(2, "0")}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            urgent ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
