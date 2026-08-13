import { useState } from "react";
import { INVESTIGATORS } from "@/lib/investigators";

export function CharacterSelect({
  code,
  takenRoles,
  busy,
  error,
  onJoin,
}: {
  code: string;
  takenRoles: string[];
  busy: boolean;
  error: string | null;
  onJoin: (investigatorId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <main className="noir-grain relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10">
      <div className="label-caps">Room {code} · Casa Fuego Madrid</div>
      <h1 className="mt-1 font-display text-4xl uppercase leading-none text-primary md:text-6xl">
        Who killed the go-live?
      </h1>
      <h2 className="mt-6 font-display text-2xl uppercase tracking-[0.2em]">
        Choose your investigator
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INVESTIGATORS.map((inv) => {
          const taken = takenRoles.includes(inv.id);
          const sel = picked === inv.id;
          return (
            <button
              key={inv.id}
              disabled={taken}
              onClick={() => setPicked(inv.id)}
              className={`panel relative flex items-center gap-4 p-4 text-left transition ${
                taken
                  ? "cursor-not-allowed opacity-40"
                  : sel
                    ? "ember-glow border-primary"
                    : "hover:border-primary/60"
              }`}
            >
              <div
                className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 bg-black/40"
                style={{ borderColor: sel ? "var(--primary)" : inv.accent }}
              >
                <img
                  src={inv.portrait}
                  alt={inv.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg uppercase leading-tight">{inv.name}</div>
                <div
                  className="mt-1 inline-block rounded-full border px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.18em]"
                  style={{ borderColor: inv.accent, color: inv.accent }}
                >
                  {inv.icon} {inv.role}
                </div>
              </div>
              {taken && (
                <span className="absolute right-3 top-3 rounded-full bg-black/80 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-nogo">
                  Taken
                </span>
              )}
              {sel && !taken && (
                <span className="absolute right-3 top-3 font-display text-xl text-primary">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Roles are identity only — every investigator has exactly the same tools, clues and access.
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <button
        disabled={!picked || busy}
        onClick={() => picked && onJoin(picked)}
        className="mt-5 self-start rounded-md bg-primary px-8 py-4 font-display text-2xl uppercase tracking-wider text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
      >
        Join investigation
      </button>
    </main>
  );
}
