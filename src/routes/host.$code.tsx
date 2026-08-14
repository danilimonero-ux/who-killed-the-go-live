import { investigatorById } from "@/lib/investigators";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCountdown, useRoom, type Player } from "@/lib/room";
import {
  ALL_EVIDENCE,
  GAME_SECONDS,
  OBJECTS,
  Q_DECISION,
  Q_KILLER,
  Q_ROOT,
  Q_WEAPON,
  Q_WHAT,
  ZONES,
  type Choice,
} from "@/lib/case";
import { useHostLive, type AccusationRow } from "@/lib/host-live";
import { useEffect, useState } from "react";
import { Debrief } from "@/components/casa/Debrief";
import { CasaMap, type MapAvatar } from "@/components/casa/CasaMap";

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
  const { accusations, events } = useHostLive(room?.id ?? null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AccusationRow | null>(null);

  // prominent live alert whenever a new accusation lands
  const latest = accusations[0] ?? null;
  useEffect(() => {
    if (!latest) return;
    setAlert(latest);
    const t = setTimeout(() => setAlert(null), 14000);
    return () => clearTimeout(t);
  }, [latest?.id]);

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

  const avatars: MapAvatar[] = detectives
    .map((p) => {
      const inv = investigatorById(p.role);
      return inv ? { id: p.id, zone: p.zone ?? "restaurant", isMe: false, inv } : null;
    })
    .filter((a): a is MapAvatar => a !== null);

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#0b0e14]">
      <header className="z-30 flex shrink-0 items-center gap-4 border-b border-white/10 bg-[#11151d] px-5 py-2">
        <div className="label-caps text-[10px]">Game Master · Casa Fuego Madrid</div>
        <div className="mx-auto flex items-center gap-3">
          <span className="label-caps text-[10px]">⏱ Shared timer</span>
          <span className="font-display text-4xl tabular-nums leading-none text-primary">
            {left === null
              ? "10:00"
              : `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, "0")}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="label-caps text-[11px]">👥 {detectives.length}</span>
          <span className="label-caps text-[11px] text-go">
            🟢 {saved.length}/{detectives.length} saved
          </span>
          <span className="label-caps text-[11px] text-nogo">💀 {fired.length}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[24%] min-w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-white/10 bg-[#11151d] p-4">
          <div>
            <div className="label-caps text-[10px]">Room code</div>
            <div className="font-display text-6xl uppercase leading-none tracking-[0.14em] text-primary">
              {room.code}
            </div>
          </div>

          {room.phase === "lobby" ? (
            <>
              <div className="panel p-3">
                <div className="label-caps text-[10px]">Read out loud · 30 seconds</div>
                <p className="mt-2 font-display text-base uppercase leading-tight">
                  “Explore Casa Fuego, click anything suspicious and collect evidence. When you know
                  what failed, why, who killed the go-live and with what, press Save the Go-Live.
                  Three attempts. Three mistakes and you're fired. Highest score wins.”
                </p>
              </div>
              <button
                onClick={() => void start()}
                disabled={detectives.length === 0}
                className="rounded-md bg-primary px-5 py-4 font-display text-2xl uppercase tracking-wider text-primary-foreground hover:brightness-110 disabled:opacity-40"
              >
                ▶ Start the investigation
              </button>
            </>
          ) : (
            <button
              onClick={() => void end()}
              className="rounded-md bg-destructive px-5 py-3 font-display text-lg uppercase tracking-wider text-destructive-foreground hover:brightness-110"
            >
              End game & reveal
            </button>
          )}

          <div className="panel flex-1 p-3">
            <div className="label-caps text-[10px]">Investigators ({detectives.length}/6)</div>
            <ul className="mt-2 space-y-2">
              {detectives.map((p) => {
                const inv = investigatorById(p.role);
                return (
                  <li
                    key={p.id}
                    onClick={() => setInspectId(p.id)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-2.5 py-2 hover:border-primary/60"
                  >
                    {inv && (
                      <span
                        className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 bg-black/40"
                        style={{ borderColor: inv.accent }}
                      >
                        <img
                          src={inv.portrait}
                          alt={inv.name}
                          loading="lazy"
                          width={768}
                          height={1024}
                          className="h-full w-full object-cover object-top"
                        />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-xs uppercase leading-tight">
                        {p.name}
                      </span>
                      <span className="label-caps text-[9px]">
                        📍 {ZONES.find((z) => z.id === (p.zone ?? "restaurant"))?.name ?? "—"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill status={p.status} />
                      <span className="text-[10px]">{"❤️".repeat(Math.max(0, 3 - p.attempts_used)) || "—"}</span>
                    </span>
                  </li>
                );
              })}
              {detectives.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Waiting for investigators to join with the code.
                </li>
              )}
            </ul>
          </div>
        </aside>

        <div className="relative min-h-0 min-w-0 flex-1 p-3">
          <CasaMap
            found={[]}
            doneActions={[]}
            selected={null}
            avatars={avatars}
            myZone={null}
            onSelect={() => {}}
            onAvatarClick={(id) => setInspectId(id)}
            avatarScale={1.35}
            readOnly

          />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/75 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            Live crime scene · click an investigator to inspect · findings stay private from players
          </div>

          <EventFeed events={events} />

          {inspectId && (
            <PlayerInspector
              player={detectives.find((p) => p.id === inspectId) ?? null}
              accusations={accusations.filter((a) => a.player_id === inspectId)}
              onClose={() => setInspectId(null)}
            />
          )}
        </div>
      </div>

      {alert && <AccusationAlert row={alert} onClose={() => setAlert(null)} />}
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


const labelOf = (list: Choice[], id: string | null) =>
  (id && list.find((c) => c.id === id)?.label) || "—";

function AccusationAlert({ row, onClose }: { row: AccusationRow; onClose: () => void }) {
  const inv = investigatorById(row.role);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[80] flex justify-center px-6">
      <div
        className="pointer-events-auto w-full max-w-2xl rounded-lg border-2 bg-[#11151d]/97 p-5 shadow-2xl backdrop-blur"
        style={{ borderColor: row.correct ? "var(--go, #4ade80)" : "var(--nogo, #ef4444)" }}
      >

        <div className="flex items-center gap-3">
          {inv && (
            <img
              src={inv.portrait}
              alt={inv.name}
              width={768}
              height={1024}
              className="h-14 w-14 shrink-0 rounded-full border-2 object-cover object-top"
              style={{ borderColor: inv.accent }}
            />
          )}
          <h2 className="font-display text-2xl uppercase leading-tight text-primary">
            {(inv?.short ?? row.player_name).toUpperCase()} IS MAKING AN ACCUSATION — ATTEMPT{" "}
            {row.attempt}/3
          </h2>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          <Field k="What failed" v={labelOf(Q_WHAT, row.what)} />
          <Field k="Root cause" v={labelOf(Q_ROOT, row.root)} />
          <Field k="Killer" v={labelOf(Q_KILLER, row.killer)} />
          <Field k="Weapon" v={labelOf(Q_WEAPON, row.weapon)} />
          <Field k="Decision" v={labelOf(Q_DECISION, row.decision)} />
        </dl>

        <div
          className={`mt-5 rounded-md px-4 py-3 text-center font-display text-3xl uppercase ${
            row.correct ? "bg-go/20 text-go" : "bg-nogo/20 text-nogo"
          }`}
        >
          {row.correct ? "✅ Correct · Go-live saved" : "❌ Wrong accusation"}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-border px-4 py-2 font-display text-sm uppercase tracking-wider hover:border-primary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <dt className="label-caps text-[10px]">{k}</dt>
      <dd className="font-display text-sm uppercase leading-tight">{v}</dd>
    </div>
  );
}

function PlayerInspector({
  player,
  accusations,
  onClose,
}: {
  player: Player | null;
  accusations: AccusationRow[];
  onClose: () => void;
}) {
  if (!player) return null;
  const inv = investigatorById(player.role);
  const found = (player.found_ids ?? []).map(
    (id) => ALL_EVIDENCE.find((e) => e.id === id) ?? null,
  );
  const actions = (player.done_ids ?? []).map((id) => {
    for (const o of OBJECTS) {
      const a = o.actions.find((ac) => ac.id === id);
      if (a) return `${o.name} · ${a.label}`;
    }
    return id;
  });

  return (
    <aside className="absolute right-4 top-4 z-50 flex max-h-[calc(100%-2rem)] w-[340px] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#11151d]/97 shadow-2xl backdrop-blur">
      <header className="flex items-center gap-2 border-b border-white/10 p-3">
        {inv && (
          <img
            src={inv.portrait}
            alt={inv.name}
            width={768}
            height={1024}
            className="h-10 w-10 rounded-full border-2 object-cover object-top"
            style={{ borderColor: inv.accent }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm uppercase">{player.name}</div>
          <div className="label-caps text-[9px]">{inv?.role ?? "Investigator"}</div>
        </div>
        <button onClick={onClose} className="px-2 text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-white/10 p-3 text-[11px]">
        <span className="label-caps">
          📍 {ZONES.find((z) => z.id === (player.zone ?? "restaurant"))?.name ?? "—"}
        </span>
        <StatusPill status={player.status} />
        <span className="label-caps">🎯 {player.score}</span>
        <span className="label-caps">
          ❤️ {Math.max(0, 3 - player.attempts_used)}/3 left · {player.attempts_used} used
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <div className="label-caps text-[10px]">Evidence discovered ({found.length})</div>
          <ul className="mt-1 space-y-1">
            {found.map((e, i) => (
              <li key={i} className="rounded border border-border px-2 py-1 text-[11px]">
                <span className="font-display uppercase">{e?.title ?? "Unknown clue"}</span>
                {e?.line && <span className="block text-muted-foreground">{e.line}</span>}
              </li>
            ))}
            {found.length === 0 && (
              <li className="text-[11px] text-muted-foreground">Nothing found yet.</li>
            )}
          </ul>
        </div>

        <div>
          <div className="label-caps text-[10px]">Tests & actions ({actions.length})</div>
          <ul className="mt-1 space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="text-[11px] text-muted-foreground">
                • {a}
              </li>
            ))}
            {actions.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No tests performed yet.</li>
            )}
          </ul>
        </div>

        <div>
          <div className="label-caps text-[10px]">Accusation history</div>
          <ul className="mt-1 space-y-1">
            {accusations.map((a) => (
              <li
                key={a.id}
                className={`rounded border px-2 py-1 text-[11px] ${
                  a.correct ? "border-go/50 text-go" : "border-nogo/50 text-nogo"
                }`}
              >
                <span className="font-display uppercase">
                  Attempt {a.attempt}/3 · {a.correct ? "Saved the go-live" : "Wrong"}
                </span>
                <span className="block text-muted-foreground">
                  {labelOf(Q_WHAT, a.what)} → {labelOf(Q_ROOT, a.root)} · {labelOf(Q_KILLER, a.killer)}{" "}
                  · {labelOf(Q_WEAPON, a.weapon)} · {labelOf(Q_DECISION, a.decision)}
                </span>
              </li>
            ))}
            {accusations.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No accusations yet.</li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}

const EVENT_ICON: Record<string, string> = {
  move: "🚶",
  evidence: "🔎",
  action: "🧪",
  wrong: "❌",
  saved: "🏆",
  fired: "💀",
  reset: "♻️",
};

function EventFeed({ events }: { events: { id: string; kind: string; player_name: string | null; message: string; created_at: string }[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute bottom-4 left-4 z-50 w-[300px] overflow-hidden rounded-lg border border-white/15 bg-[#11151d]/95 backdrop-blur">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="label-caps text-[10px]">📡 Live activity</span>
        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="max-h-[240px] space-y-1 overflow-y-auto px-3 pb-3 text-[11px]">
          {events.map((e) => (
            <li key={e.id} className="flex gap-1.5 leading-snug">
              <span className="tabular-nums text-muted-foreground">
                {new Date(e.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span>
                {EVENT_ICON[e.kind] ?? "•"} <b className="font-display uppercase">{e.player_name ?? "—"}</b>{" "}
                {e.message}
              </span>
            </li>
          ))}
          {events.length === 0 && <li className="text-muted-foreground">Nothing yet.</li>}
        </ul>
      )}
    </div>
  );
}
