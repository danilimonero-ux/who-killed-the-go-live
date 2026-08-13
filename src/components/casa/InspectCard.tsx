import { useEffect, useState } from "react";
import { VERB_META, objectById, type Action } from "@/lib/case";

export function InspectCard({
  objectId,
  done,
  found,
  onRun,
  onClose,
}: {
  objectId: string;
  done: string[];
  found: string[];
  onRun: (a: Action) => void;
  onClose: () => void;
}) {
  const obj = objectById(objectId);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => setOpen(null), [objectId]);
  if (!obj) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel noir-grain w-full max-w-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{obj.icon}</span>
            <div>
              <h2 className="font-display text-2xl uppercase leading-none">{obj.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{obj.blurb}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 font-display text-xs uppercase hover:border-primary hover:text-primary"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {obj.actions.map((a) => {
            const locked = (a.requires ?? []).some((r) => !found.includes(r));
            const isOpen = open === a.id;
            const wasDone = done.includes(a.id);
            const meta = VERB_META[a.verb];
            return (
              <div key={a.id} className="rounded-md border border-border/80 bg-black/30">
                <button
                  disabled={locked}
                  onClick={() => {
                    setOpen(isOpen ? null : a.id);
                    if (!isOpen) onRun(a);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left font-display text-sm uppercase tracking-wider transition ${
                    locked
                      ? "cursor-not-allowed text-muted-foreground"
                      : isOpen
                        ? "text-primary"
                        : "hover:text-primary"
                  }`}
                >
                  <span className="text-lg">{meta.icon}</span>
                  <span className="flex-1">{a.label}</span>
                  {locked ? <span className="text-xs">🔒</span> : wasDone ? <span className="text-xs text-evidence">seen</span> : null}
                </button>
                {locked && isOpenHint(a) && (
                  <p className="px-3 pb-3 text-xs text-muted-foreground">{a.lockedHint}</p>
                )}
                {isOpen && !locked && (
                  <div className="border-t border-border/70 px-4 py-3">
                    <ul className="space-y-1 font-mono text-[13px] leading-relaxed text-foreground/90">
                      {a.lines.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                    {a.evidence && (
                      <div className="mt-3 flex items-start gap-3 rounded-md border border-evidence/50 bg-evidence/10 p-3">
                        <span className="text-2xl">{a.evidence.icon}</span>
                        <div>
                          <div className="label-caps text-[10px] text-evidence">
                            Evidence discovered · {a.evidence.code}
                          </div>
                          <div className="font-display text-lg uppercase leading-tight">
                            {a.evidence.title}
                          </div>
                          <p className="mt-1 text-sm text-foreground/85">{a.evidence.line}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const isOpenHint = (a: Action) => Boolean(a.lockedHint);
