import type { Suspect } from "@/lib/game";

export function EvidenceCard({ suspect, showFinding = true }: { suspect: Suspect; showFinding?: boolean }) {
  const positive = suspect.delta > 0;
  return (
    <div className="panel noir-grain relative overflow-hidden p-5 md:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="label-caps">Evidence file — {suspect.name}</div>
      <p className="mt-3 font-mono text-sm leading-relaxed text-evidence md:text-base">
        {suspect.evidence}
      </p>
      {showFinding && (
        <p className="mt-4 border-l-2 border-primary/60 pl-4 text-sm leading-relaxed text-foreground/90 md:text-base">
          {suspect.finding}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded border border-border bg-secondary px-2.5 py-1 font-display text-xs uppercase tracking-widest">
          Correct call: {suspect.correct}
        </span>
        <span
          className="font-display text-lg tabular-nums"
          style={{ color: positive ? "var(--go)" : "var(--nogo)" }}
        >
          {positive ? "+" : ""}
          {suspect.delta}
        </span>
        <span className="text-xs text-muted-foreground">{suspect.deltaLabel}</span>
      </div>
    </div>
  );
}
