import { investigatorById } from "@/lib/investigators";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCountdown, useRoom, type Player } from "@/lib/room";
import { GAME_SECONDS } from "@/lib/case";
import { Debrief } from "@/components/casa/Debrief";

export const Route = createFileRoute("/host/$code")({
  head: () => ({
    meta: [
      { title: "Game Master — Who Killed the Go-Live?" },
      {
        name: "description",
        content:
          "Game Master console for the Casa Fuego investigation: room code, joined implementers, shared timer, live status and the final leaderboard.",
      },
      { property: "og:title", content: "Game Master — Casa Fuego" },
      {
        property: "og:description",
        content: "Start the room, watch the status board, reveal the debrief and leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HostScreen,
});

function HostScreen() {
  const { code } = Route.useParams();
  const { room, players, loading, missing } = useRoom(code);
  const left = useCountdown(room?.timer_ends_at ?? null);

  if (loading)
    return <Center>Opening the case file…</Center>;
  if (missing || !room) return <Center>No investigation found for code {code}.</Center>;

  const detectives = players.filter((p) => !p.is_host);
  const saved = detectives.filter((p) => p.status === "saved");
  const fired = detectives.filter((p) => p.status === "fired");

  const start = async () => {
    const ends = new Date(Date.now() + GAME_SECONDS * 1000).toISOString();
    await supabase
      .from("rooms")
      .update({ phase: "running", started_at: new Date().toISOString(), timer_ends_at: ends })
      .eq("id", room.id);
  };
  const end = async () => {
    await supabase.from("rooms").update({ phase: "ended" }).eq("id", room.id);
  };

  if (room.phase === "ended")
    return (
      <main className="noir-grain mx-auto max-w-5xl px-5 py-8">
        <Debrief />
        <Leaderboard players={detectives} />
      </main>
    );

  return (
    <main className="noir-grain mx-auto max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-caps">Game Master · Casa Fuego Madrid</div>
          <h1 className="font-display text-6xl uppercase leading-none tracking-[0.15em] text-primary">
            {room.code}
          </h1>
        </div>
        <div className="text-right">
          <div className="label-caps">Shared timer</div>
          <div className="font-display text-6xl tabular-nums leading-none">
            {left === null
              ? "10:00"
              : `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, "0")}`}
          </div>
        </div>
      </header>

      {room.phase === "lobby" ? (
        <>
          <section className="panel mt-6 p-5">
            <div className="label-caps">Read this out loud · 30 seconds</div>
            <p className="mt-2 font-display text-2xl uppercase leading-tight">
              “Explore Casa Fuego, click anything suspicious and collect evidence. When you think you
              know what failed, why, who killed the go-live and with what, press Save the Go-Live.
              You have three attempts. Three mistakes and you're fired. Highest score wins.”
            </p>
          </section>
          <button
            onClick={() => void start()}
            disabled={detectives.length === 0}
            className="mt-5 w-full rounded-md bg-primary px-6 py-5 font-display text-3xl uppercase tracking-wider text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            ▶ Start the investigation
          </button>
        </>
      ) : (
        <section className="panel mt-6 flex flex-wrap items-center gap-6 p-5">
          <Big k="Saved" v={`${saved.length}/${detectives.length}`} />
          <Big k="Fired" v={String(fired.length)} />
          <Big k="Still investigating" v={String(detectives.filter((p) => p.status === "investigating").length)} />
          <button
            onClick={() => void end()}
            className="ml-auto rounded-md bg-destructive px-6 py-3 font-display text-xl uppercase tracking-wider text-destructive-foreground hover:brightness-110"
          >
            End game & reveal
          </button>
        </section>
      )}

      <section className="panel mt-5 p-5">
        <div className="label-caps">Implementers ({detectives.length})</div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {detectives.map((p) => {
            const inv = investigatorById(p.role);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {inv && (
                    <span
                      className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 bg-black/40"
                      style={{ borderColor: inv.accent }}
                    >
                      <img
                        src={inv.portrait}
                        alt={inv.name}
                        loading="lazy"
                        width={512}
                        height={512}
                        className="h-full w-full object-cover object-top"
                      />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg uppercase leading-tight">
                      {p.name}
                    </span>
                    {inv && (
                      <span className="label-caps text-[10px]" style={{ color: inv.accent }}>
                        {inv.icon} {inv.role}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span>{"❤️".repeat(Math.max(0, 3 - p.attempts_used))}</span>
                  <StatusPill status={p.status} />
                </span>
              </li>
            );
          })}

          {detectives.length === 0 && (
            <li className="text-muted-foreground">Waiting for players to join with the code.</li>
          )}
        </ul>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    lobby: ["Joined", "border-border text-muted-foreground"],
    investigating: ["Investigating", "border-primary/60 text-primary"],
    saved: ["Saved 🏆", "border-go/60 text-go"],
    fired: ["Fired 💀", "border-nogo/60 text-nogo"],
    timeout: ["Timed out ⏳", "border-border text-muted-foreground"],
  };
  const [label, cls] = map[status] ?? ["Joined", "border-border text-muted-foreground"];
  return (
    <span className={`rounded-full border px-3 py-1 font-display text-xs uppercase ${cls}`}>
      {label}
    </span>
  );
}

function Leaderboard({ players }: { players: Player[] }) {
  const ranked = [...players].sort(
    (a, b) => b.score - a.score || (a.finish_seconds ?? 99999) - (b.finish_seconds ?? 99999),
  );
  const solved = ranked.filter((p) => p.status === "saved");
  const fastest = solved[0]
    ? [...solved].sort((a, b) => (a.finish_seconds ?? 9e9) - (b.finish_seconds ?? 9e9))[0]
    : null;
  const oneShot = solved.find((p) => p.attempts_used === 1) ?? null;
  const herring = [...players].sort((a, b) => b.red_herrings - a.red_herrings)[0] ?? null;
  const blamer = players.find((p) => p.status === "fired") ?? null;

  return (
    <section className="panel mt-6 p-5">
      <div className="label-caps">Final leaderboard</div>
      <ol className="mt-3 space-y-2">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 font-display text-xl uppercase"
          >
            <span>
              {i + 1}. {p.name}{" "}
              {p.status === "saved" ? "🏆" : p.status === "fired" ? "💀" : "⏳"}
            </span>
            <span className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                🔎 {p.evidence_count} · ❤️ {Math.max(0, 3 - p.attempts_used)}
              </span>
              <span className="text-primary">{p.score}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Award title="🥇 Master Implementer" who={ranked[0]?.name} />
        <Award title="⚡ Fastest Recovery" who={fastest?.name} />
        <Award title="🎯 One Shot" who={oneShot?.name} />
        <Award title="🐟 Red Herring Collector" who={herring?.name} />
        <Award title="🖨️ Printer Blamer of the Year" who={blamer?.name} />
      </div>
    </section>
  );
}

function Award({ title, who }: { title: string; who?: string | undefined }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="label-caps">{title}</div>
      <div className="font-display text-2xl uppercase">{who ?? "—"}</div>
    </div>
  );
}

function Big({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="label-caps">{k}</div>
      <div className="font-display text-4xl">{v}</div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <p className="font-display text-2xl uppercase text-muted-foreground">{children}</p>
    </main>
  );
}
