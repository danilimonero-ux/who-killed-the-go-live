import { useState } from "react";
import {
  INTERACT_RANGE,
  discoveryKey,
  isStepUnlocked,
  objectById,
  type Severity,
} from "@/lib/map";
import { ROLES } from "@/lib/game";

const toneClass: Record<Severity | string, string> = {
  ok: "text-go border-go/50 bg-go/10",
  warn: "text-evidence border-evidence/50 bg-evidence/10",
  blocker: "text-nogo border-nogo/50 bg-nogo/10",
};

export function InspectPanel({
  objectId,
  found,
  role,
  near,
  onClose,
  onRun,
  readOnly = false,
}: {
  objectId: string;
  found: Set<string>;
  role: string | null;
  near: boolean;
  onClose: () => void;
  onRun: (objectId: string, step: number) => Promise<void> | void;
  readOnly?: boolean;
}) {
  const obj = objectById(objectId);
  const [busy, setBusy] = useState<number | null>(null);
  if (!obj) return null;

  return (
    <aside className="panel noir-grain fixed inset-x-3 bottom-3 z-50 max-h-[70vh] overflow-y-auto p-5 md:inset-auto md:bottom-6 md:right-6 md:top-24 md:w-[420px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label-caps">Inspection · {obj.zone}</div>
          <h2 className="font-display text-2xl uppercase leading-tight">
            <span className="mr-2">{obj.glyph}</span>
            {obj.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-border px-3 py-1 font-display text-sm uppercase hover:border-primary hover:text-primary"
        >
          Close
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{obj.blurb}</p>

      {!near && !readOnly && (
        <p className="mt-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
          Walk closer to interact — you need to be within {INTERACT_RANGE}px of it.
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {obj.steps.map((s, i) => {
          const key = discoveryKey(obj.id, i);
          const done = found.has(key);
          const prevDone = i === 0 || found.has(discoveryKey(obj.id, i - 1));
          const unlocked = isStepUnlocked(s, role, found);
          const roleName = ROLES.find((r) => r.id === s.role)?.name;

          if (done)
            return (
              <li key={key} className={`rounded-md border p-3 ${toneClass[s.severity]}`}>
                <div className="label-caps" style={{ color: "inherit" }}>
                  {s.severity === "ok" ? "Confirmed" : s.severity === "warn" ? "Lead" : "Blocker"}
                </div>
                <div className="mt-1 font-display text-lg uppercase leading-tight">{s.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{s.detail}</p>
              </li>
            );

          const blocked = !prevDone || !unlocked || (!near && !readOnly) || readOnly;
          return (
            <li key={key} className="rounded-md border border-border p-3">
              <button
                disabled={blocked || busy !== null}
                onClick={async () => {
                  setBusy(i);
                  await onRun(obj.id, i);
                  setBusy(null);
                }}
                className={`w-full rounded-md px-4 py-3 font-display text-base uppercase tracking-wider transition ${
                  blocked
                    ? "border border-border text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:brightness-110"
                }`}
              >
                {busy === i ? "Working…" : s.action}
              </button>
              {!prevDone && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Do the previous check first — the obvious answer comes before the real one.
                </p>
              )}
              {prevDone && !unlocked && (
                <p className="mt-2 text-xs text-evidence/90">
                  Locked · {s.lockedHint ?? (roleName ? `${roleName} access required.` : "Needs another finding.")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
