import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BRIEFING_LINE,
  CASE_FACTS,
  CLOSING_LINE,
  INITIAL_OPTIONS,
  PHASE_LABEL,
  PHASE_SECONDS,
  ROLES,
  SUSPECTS,
  roleById,
  type Phase,
} from "@/lib/game";
import { castVote, readPlayerId, storePlayerId, tally, useRoom } from "@/lib/room";
import { useDiscoveries, recordDiscovery } from "@/lib/discoveries";
import { TOTAL_STEPS, objectById } from "@/lib/map";
import { MapCanvas } from "@/components/game/map/MapCanvas";
import { InspectPanel } from "@/components/game/map/InspectPanel";
import { DiscoveryFeed } from "@/components/game/map/DiscoveryFeed";
import { EvidenceBoard } from "@/components/game/map/EvidenceBoard";
import { Timer } from "@/components/game/Timer";
import { ConfidenceMeter } from "@/components/game/ConfidenceMeter";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "Detective Screen — Who Killed the Go-Live?" },
      {
        name: "description",
        content:
          "Your detective console for the Casa Fuego Madrid launch investigation: vote on suspects, classify evidence and use your one-time power.",
      },
      { property: "og:title", content: "Detective Screen — Who Killed the Go-Live?" },
      {
        property: "og:description",
        content: "Vote on suspects, classify the evidence and cast the final verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerScreen,
});

function PlayerScreen() {
  const { code } = Route.useParams();
  const { room, players, votes, loading, missing } = useRoom(code);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [showClue, setShowClue] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [board, setBoard] = useState(false);
  const { discoveries, found } = useDiscoveries(room?.id);

  useEffect(() => {
    setPlayerId(readPlayerId(code));
  }, [code]);

  if (loading) return <Shell>Connecting to the crime scene…</Shell>;
  if (missing || !room) return <Shell>No investigation found for code {code}.</Shell>;

  const me = players.find((p) => p.id === playerId) ?? null;
  if (!me)
    return (
      <LateJoin
        code={code}
        roomId={room.id}
        onJoined={(id) => {
          storePlayerId(code, id);
          setPlayerId(id);
        }}
      />
    );

  const phase = room.phase as Phase;
  const role = roleById(me.role);
  const detectives = players.filter((p) => !p.is_host);
  const myVote = (kind: string, round: number) =>
    votes.find((v) => v.player_id === me.id && v.kind === kind && v.round === round)?.value ?? null;

  const onMap = phase === "investigate" || phase === "connect";

  const runStep = async (objectId: string, step: number) => {
    await recordDiscovery(room.id, objectId, step, { id: me.id, name: me.name });
  };

  const usePower = async () => {
    setShowClue(true);
    if (!me.power_used) await supabase.from("players").update({ power_used: true }).eq("id", me.id);
  };

  if (onMap)
    return (
      <main className="fixed inset-0 flex flex-col overflow-hidden bg-background">
        {/* slim HUD */}
        <header className="z-30 flex shrink-0 items-center gap-4 border-b border-border/70 bg-black/50 px-4 py-2 backdrop-blur">
          <div className="min-w-0">
            <div className="label-caps text-[10px]">{room.code} · Casa Fuego Madrid</div>
            <div className="font-display text-lg uppercase leading-none">{PHASE_LABEL[phase]}</div>
          </div>
          <div className="hidden min-w-0 md:block">
            <div className="label-caps text-[10px]">{me.name}</div>
            <div className="font-display text-base uppercase leading-none text-primary">
              {role?.name ?? "Observer"}
            </div>
          </div>
          <div className="mx-auto hidden w-64 md:block">
            <ConfidenceMeter value={room.confidence} compact />
          </div>
          <button
            onClick={() => void usePower()}
            disabled={!role || (me.power_used && showClue)}
            className={`rounded-md px-3 py-1.5 font-display text-xs uppercase tracking-wider transition ${
              me.power_used
                ? "border border-border text-muted-foreground"
                : "bg-primary text-primary-foreground hover:brightness-110"
            }`}
          >
            {me.power_used ? "Power used" : role?.power ?? "No power"}
          </button>
          <div className="w-24 shrink-0">
            <Timer endsAt={room.timer_ends_at} total={PHASE_SECONDS[phase] ?? 60} />
          </div>
        </header>

        {/* map stage */}
        <div className="relative min-h-0 flex-1">
          <MapCanvas
            roomId={room.id}
            self={{ id: me.id, name: me.name, role: me.role }}
            found={found}
            selectedId={selected}
            onSelect={setSelected}
            onNearChange={setNear}
            onZoneChange={setZone}
            frozen={board}
            fit
          />

          {showClue && role && (
            <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-sm rounded-md border border-evidence/40 bg-black/80 p-3 font-mono text-xs leading-relaxed text-evidence backdrop-blur">
              {role.clue}
            </div>
          )}

          {/* floating discovery HUD */}
          <div className="absolute right-3 top-3 z-30 w-[280px] max-w-[42vw]">
            <div className="rounded-lg bg-black/60 backdrop-blur">
              <DiscoveryFeed discoveries={discoveries} total={TOTAL_STEPS} compact />
            </div>
            <button
              onClick={() => setBoard(true)}
              className="mt-2 w-full rounded-md border border-border bg-black/60 px-3 py-2 font-display text-sm uppercase tracking-wider backdrop-blur hover:border-primary hover:text-primary"
            >
              Evidence board
            </button>
            {phase === "connect" && (
              <div className="panel mt-2 bg-black/70 p-3 backdrop-blur">
                <div className="label-caps text-[10px]">Name the primary cause</div>
                <div className="mt-2 grid gap-1.5">
                  {SUSPECTS.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => void castVote(room.id, me.id, "suspect", 1, sp.id)}
                      className={`rounded-md border px-2.5 py-1.5 text-left font-display text-xs uppercase tracking-wide transition ${
                        myVote("suspect", 1) === sp.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border hover:border-primary/60"
                      }`}
                    >
                      {sp.name}
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {tally(votes, "suspect", 1)[sp.id] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selected && (
            <InspectPanel
              objectId={selected}
              found={found}
              role={me.role}
              near={near === selected || objectById(selected)?.zone === zone}
              onClose={() => setSelected(null)}
              onRun={runStep}
            />
          )}
          {board && <EvidenceBoard discoveries={discoveries} onClose={() => setBoard(false)} />}
        </div>
      </main>
    );

  return (
    <main className="noir-grain mx-auto max-w-3xl px-4 py-5">

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="label-caps">{room.code} · Casa Fuego Madrid</div>
          <h1 className="font-display text-2xl uppercase leading-none md:text-3xl">
            {PHASE_LABEL[phase]}

          </h1>
        </div>
        <div className="w-32 shrink-0">
          <Timer endsAt={room.timer_ends_at} total={PHASE_SECONDS[phase] ?? 60} />
        </div>
      </header>

      <div className="panel mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label-caps">{me.name}</div>
            <div className="font-display text-xl uppercase text-primary">
              {role?.name ?? "Observer"}
            </div>
          </div>
          <button
            onClick={() => void usePower()}
            disabled={!role || (me.power_used && showClue)}
            className={`rounded-md px-4 py-2 font-display text-sm uppercase tracking-wider transition ${
              me.power_used
                ? "border border-border text-muted-foreground"
                : "bg-primary text-primary-foreground hover:brightness-110"
            }`}
          >
            {me.power_used ? "Power used" : role?.power ?? "No power"}
          </button>
        </div>
        {role && <p className="mt-2 text-sm text-muted-foreground">{role.brief}</p>}
        {showClue && role && (
          <p className="mt-3 rounded-md border border-evidence/40 bg-evidence/5 p-3 font-mono text-sm leading-relaxed text-evidence">
            {role.clue}
          </p>
        )}
      </div>

      <div className="panel mt-4 p-4">
        <ConfidenceMeter value={room.confidence} compact />
      </div>

      {phase === "lobby" && (
        <Card title="Waiting for the Game Master">
          <p className="text-muted-foreground">
            {detectives.length} detective{detectives.length === 1 ? "" : "s"} on the scene. The
            briefing starts shortly.
          </p>
        </Card>
      )}

      {phase === "briefing" && (
        <Card title="Crime scene">
          <p className="font-display text-xl uppercase leading-tight text-primary">{BRIEFING_LINE}</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/90">
            {CASE_FACTS.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-primary">—</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {phase === "initial" && (
        <Card title="First instinct — no evidence yet">
          <Options
            options={[...INITIAL_OPTIONS]}
            selected={myVote("initial", 0)}
            onSelect={(v) => void castVote(room.id, me.id, "initial", 0, v)}
          />
        </Card>
      )}

      {phase === "verdict" && (
        <Card title="Your final verdict">
          <Options
            options={[...INITIAL_OPTIONS]}
            selected={myVote("verdict", 0)}
            onSelect={(v) => void castVote(room.id, me.id, "verdict", 0, v)}
          />
        </Card>
      )}

      {phase === "reveal" && (
        <Card title="Case closed">
          <p className="font-display text-3xl uppercase leading-tight">
            The killer was <span className="text-primary">Partner Assumption.</span>
          </p>
          <p className="mt-3 font-display text-xl uppercase text-evidence">
            The weapon was a checklist with no evidence.
          </p>
          <p className="mt-6 font-display text-2xl uppercase tracking-[0.12em]">
            No evidence, no go-live.
          </p>
          <p className="mt-4 text-base text-foreground/85">{CLOSING_LINE}</p>
        </Card>
      )}
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mt-4 p-4 md:p-5">
      <div className="label-caps">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Options({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={`rounded-md border px-4 py-3 font-display text-lg uppercase tracking-wider transition ${
            selected === o
              ? "ember-glow border-primary bg-primary/15 text-primary"
              : "border-border hover:border-primary/60"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function LateJoin({
  code,
  roomId,
  onJoined,
}: {
  code: string;
  roomId: string;
  onJoined: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[0]!.id);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data } = await supabase
      .from("players")
      .insert({ room_id: roomId, name: name.trim() || "Detective", role })
      .select()
      .single();
    if (data) onJoined(data.id);
    else setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="panel noir-grain p-6">
        <div className="label-caps">Room {code}</div>
        <h1 className="mt-1 font-display text-3xl uppercase">Join the investigation</h1>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="w-full rounded-md border border-input bg-background/60 px-4 py-3 outline-none focus:border-primary"
          />
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  role === r.id
                    ? "border-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <span className="font-display uppercase tracking-wide">{r.name}</span>
              </button>
            ))}
          </div>
          <button
            disabled={busy}
            className="w-full rounded-md bg-primary px-5 py-3 font-display text-lg uppercase tracking-wider text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            Enter the scene
          </button>
        </form>
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <p className="font-display text-2xl uppercase text-muted-foreground">{children}</p>
    </main>
  );
}
