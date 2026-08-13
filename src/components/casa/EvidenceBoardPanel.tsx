import { ALL_EVIDENCE } from "@/lib/case";

export function EvidenceBoardPanel({ found, onClose }: { found: string[]; onClose: () => void }) {
  const items = ALL_EVIDENCE.filter((e) => found.includes(e.id));
  const chain = [
    { icon: "🥩", label: "Ribeye 300g", on: found.includes("E06a") },
    { icon: "📥", label: "Menu import fallback", on: found.includes("E08") },
    { icon: "🗂️", label: "Accounting Group VARIOS", on: found.includes("E06") },
    { icon: "🏭", label: "Production Center ⌀", on: found.includes("E06") },
    { icon: "🖨️", label: "No printer route", on: found.includes("E06") && found.includes("E05") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="panel noir-grain my-6 w-full max-w-4xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="label-caps">Your private evidence board</div>
            <h2 className="font-display text-3xl uppercase">{items.length} pieces of evidence</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 font-display uppercase hover:border-primary hover:text-primary"
          >
            Back to Casa Fuego
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {chain.map((c, i) => (
            <div key={c.label} className="flex items-center gap-2">
              <div
                className={`rounded-md border px-3 py-2 font-display text-xs uppercase tracking-wider ${
                  c.on ? "border-primary/70 bg-primary/15 text-primary" : "border-border text-muted-foreground opacity-50"
                }`}
              >
                {c.icon} {c.on ? c.label : "???"}
              </div>
              {i < chain.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map((e) => (
            <div
              key={e.id}
              className={`rounded-md border p-4 ${
                e.kind === "key"
                  ? "border-primary/60 bg-primary/10"
                  : e.kind === "herring"
                    ? "border-evidence/40 bg-evidence/5"
                    : "border-border bg-black/30"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-display text-lg uppercase">
                  {e.icon} {e.title}
                </div>
                <div className="label-caps text-[10px]">{e.code}</div>
              </div>
              <p className="mt-1 text-sm text-foreground/85">{e.line}</p>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-muted-foreground">Nothing yet. Click glowing objects on the map.</p>
          )}
        </div>
      </div>
    </div>
  );
}
