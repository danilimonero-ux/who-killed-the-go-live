export function Debrief({ compact = false }: { compact?: boolean }) {
  const chain = [
    { icon: "🥩", label: "Ribeye" },
    { icon: "📥", label: "Menu import" },
    { icon: "❓", label: "Unmatched accounting group" },
    { icon: "🗂️", label: "Fallback VARIOS" },
    { icon: "🏭", label: "No production center" },
    { icon: "🖨️", label: "No printer route" },
  ];
  return (
    <div className={compact ? "" : "panel noir-grain p-6"}>
      <div className="label-caps">Case debrief</div>
      <h2 className="font-display text-3xl uppercase leading-none md:text-4xl">
        How the go-live died
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {chain.map((c, i) => (
          <div key={c.label} className="flex items-center gap-2">
            <span className="rounded-md border border-primary/60 bg-primary/10 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary">
              {c.icon} {c.label}
            </span>
            {i < chain.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      <p className="mt-5 font-display text-2xl uppercase leading-tight text-evidence">
        ⚙️ Configuration was the failure mechanism, not the killer.
      </p>
      <p className="mt-3 text-base text-foreground/85">
        The printer was tested. The network was tested. Payments were tested. PMS was tested. But the
        order flow was never proven.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-nogo/60 bg-nogo/10 p-4">
          <div className="label-caps">Killer</div>
          <div className="font-display text-3xl uppercase">👤 Partner assumption</div>
        </div>
        <div className="rounded-md border border-evidence/50 bg-evidence/5 p-4">
          <div className="label-caps">Weapon</div>
          <div className="font-display text-3xl uppercase">📋 A checklist without evidence</div>
        </div>
      </div>

      <p className="mt-6 font-display text-3xl uppercase leading-tight md:text-4xl">
        A go-live is not ready when everything is configured. It is ready when everything is proven.
      </p>
      <p className="mt-3 font-display text-2xl uppercase tracking-[0.18em] text-primary">
        Configuration ≠ validation
      </p>
    </div>
  );
}
