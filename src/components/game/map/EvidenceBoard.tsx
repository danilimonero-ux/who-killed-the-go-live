import type { Discovery } from "@/lib/discoveries";
import { SUSPECTS } from "@/lib/game";
import { OBJECTS, ZONES, discoveryKey } from "@/lib/map";

export function EvidenceBoard({
  discoveries,
  onClose,
}: {
  discoveries: Discovery[];
  onClose: () => void;
}) {
  const found = new Set(discoveries.map((d) => discoveryKey(d.object_id, d.step)));
  const byConclusion = new Map<string, Discovery[]>();
  for (const d of discoveries) {
    const k = d.points_to ?? "other";
    byConclusion.set(k, [...(byConclusion.get(k) ?? []), d]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel noir-grain my-6 w-full max-w-5xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="label-caps">Evidence board</div>
            <h2 className="font-display text-3xl uppercase">What the team has proven</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 font-display uppercase hover:border-primary hover:text-primary"
          >
            Back to the map
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {SUSPECTS.map((s) => {
            const list = byConclusion.get(s.id) ?? [];
            const worst = list.some((d) => d.severity === "blocker")
              ? "blocker"
              : list.some((d) => d.severity === "warn")
                ? "warn"
                : list.length
                  ? "ok"
                  : "none";
            return (
              <div
                key={s.id}
                className={`rounded-md border p-4 ${
                  worst === "blocker"
                    ? "border-nogo/60 bg-nogo/10"
                    : worst === "warn"
                      ? "border-evidence/50 bg-evidence/5"
                      : worst === "ok"
                        ? "border-go/50 bg-go/5"
                        : "border-border opacity-60"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-xl uppercase">{s.name}</div>
                  <div className="label-caps">{list.length} finding{list.length === 1 ? "" : "s"}</div>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {list.map((d) => (
                    <li key={d.id} className="text-sm leading-snug text-foreground/85">
                      — {d.title}
                    </li>
                  ))}
                  {list.length === 0 && (
                    <li className="text-sm text-muted-foreground">No evidence gathered.</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {ZONES.map((z) => {
            const objs = OBJECTS.filter((o) => o.zone === z.id);
            const steps = objs.reduce((n, o) => n + o.steps.length, 0);
            const done = objs.reduce(
              (n, o) => n + o.steps.filter((_, i) => found.has(discoveryKey(o.id, i))).length,
              0,
            );
            return (
              <div key={z.id} className="rounded-md border border-border p-3">
                <div className="label-caps">{z.name}</div>
                <div className="mt-1 font-display text-2xl text-primary">
                  {done}/{steps}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
