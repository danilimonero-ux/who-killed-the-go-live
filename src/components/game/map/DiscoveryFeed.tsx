import type { Discovery } from "@/lib/discoveries";
import { objectById } from "@/lib/map";

const dot: Record<string, string> = {
  ok: "var(--go)",
  warn: "var(--evidence)",
  blocker: "var(--nogo)",
};

export function DiscoveryFeed({
  discoveries,
  total,
  compact = false,
}: {
  discoveries: Discovery[];
  total: number;
  compact?: boolean;
}) {
  const items = [...discoveries].reverse();
  return (
    <div className="panel flex h-full flex-col p-4">
      <div className="flex items-baseline justify-between">
        <div className="label-caps">Discovery feed</div>
        <div className="font-display text-sm text-primary">
          {discoveries.length}/{total}
        </div>
      </div>
      <ul className={`mt-3 space-y-2 overflow-y-auto ${compact ? "max-h-52" : "max-h-[46vh]"}`}>
        {items.map((d) => (
          <li key={d.id} className="rounded-md border border-border/70 bg-black/25 p-2.5">
            <div className="flex items-start gap-2">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: dot[d.severity] ?? "var(--muted-foreground)" }}
              />
              <div className="min-w-0">
                <div className="text-sm leading-snug text-foreground/90">{d.title}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {d.player_name ?? "Someone"} · {objectById(d.object_id)?.name ?? d.object_id}
                  {d.delta !== 0 ? ` · ${d.delta > 0 ? "+" : ""}${d.delta}` : ""}
                </div>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Nothing proven yet. Walk the floor and test something.
          </li>
        )}
      </ul>
    </div>
  );
}
