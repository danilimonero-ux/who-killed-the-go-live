import type { Suspect } from "@/lib/game";

export function SuspectCard({
  suspect,
  votes = 0,
  totalVotes = 0,
  selected = false,
  revealed = false,
  onClick,
  disabled = false,
  showVotes = true,
}: {
  suspect: Suspect;
  votes?: number;
  totalVotes?: number;
  selected?: boolean;
  revealed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  showVotes?: boolean;
}) {
  const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`panel noir-grain group relative overflow-hidden p-3 text-left transition-all duration-200 md:p-4 ${
        disabled ? "cursor-default opacity-70" : "hover:-translate-y-0.5 hover:border-primary/60"
      } ${selected ? "ember-glow border-primary" : ""} ${revealed ? "opacity-95" : ""}`}
    >
      {revealed && (
        <span className="tape absolute -right-8 top-3 rotate-45 px-8 py-0.5 font-display text-[0.6rem] uppercase tracking-widest">
          Examined
        </span>
      )}
      <div className="font-display text-lg uppercase tracking-wide md:text-xl">{suspect.name}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{suspect.tagline}</div>
      {showVotes && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            {votes} {votes === 1 ? "vote" : "votes"}
          </div>
        </div>
      )}
    </button>
  );
}
