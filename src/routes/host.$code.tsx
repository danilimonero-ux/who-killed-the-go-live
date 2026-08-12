import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  verdictBand,
  type Phase,
} from "@/lib/game";
import { tally, useRoom } from "@/lib/room";
import { useDiscoveries } from "@/lib/discoveries";
import { TOTAL_STEPS } from "@/lib/map";
import { Timer } from "@/components/game/Timer";
import { ConfidenceMeter } from "@/components/game/ConfidenceMeter";
import { MapCanvas } from "@/components/game/map/MapCanvas";
import { InspectPanel } from "@/components/game/map/InspectPanel";
import { DiscoveryFeed } from "@/components/game/map/DiscoveryFeed";
import { EvidenceBoard } from "@/components/game/map/EvidenceBoard";

export const Route = createFileRoute("/host/$code")({
  head: () => ({
    meta: [
      { title: "Game Master Panel — Who Killed the Go-Live?" },
      {
        name: "description",
        content:
          "Run the Casa Fuego Madrid launch investigation: control the timer, watch the team explore the map, track discoveries and deliver the final reveal.",
      },
      { property: "og:title", content: "Game Master Panel — Who Killed the Go-Live?" },
      {
        property: "og:description",
        content: "Control the reveals, the timer and the verdict for your team's launch mystery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HostPanel,
});

function HostPanel() {
  const { code } = Route.useParams();
  const { room, players, votes, loading, missing } = useRoom(code);
  const { discoveries } = useDiscoveries(room?.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [board, setBoard] = useState(false);

  if (loading) return <Shell>Opening the case file…</Shell>;
  if (missing || !room) return <Shell>No investigation found for code {code}.</Shell>;

  const phase = room.phase as Phase;
  const detectives = players.filter((p) => !p.is_host);
  const initialVotes = tally(votes, "initial", 0);
  const causeVotes = tally(votes, "suspect", 1);
  const verdictVotes = tally(votes, "verdict", 0);
  const band = verdictBand(room.confidence);
  const onMap = phase === "investigate" || phase === "connect";
  const blockers = discoveries.filter((d) => d.severity === "blocker");

  const setPhase = async (next: Phase) => {
    const secs = PHASE_SECONDS[next] ?? 0;
    await supabase
      .from("rooms")
      .update({
        phase: next,
        round: next === "connect" ? 1 : 0,
        current_suspect: null,
        timer_ends_at: secs > 0 ? new Date(Date.now() + secs * 1000).toISOString() : null,
      })
      .eq("id", room.id);
  };

  const NEXT: Record<string, Phase> = {
    lobby: "briefing",
    briefing: "initial",
    initial: "investigate",
    investigate: "connect",
    connect: "verdict",
    verdict: "reveal",
  };

  const NEXT_LABEL: Record<string, string> = {
    lobby: "Start briefing",
    briefing: "Open first vote",
    initial: "Send them to the scene",
    investigate: "Connect the evidence",
    connect: "Go / No-Go vote",
    verdict: "Final reveal",
    reveal: "Case closed",
  };

  const advance = async () => {
    const next = NEXT[phase];
    if (next) await setPhase(next);
  };

  const nudge = async (delta: number) => {
    await supabase
      .from("rooms")
      .update({ confidence: Math.max(0, Math.min(100, room.confidence + delta)) })
      .eq("id", room.id);
  };

  const restart = async () => {
    await supabase.from("votes").delete().eq("room_id", room.id);
    await supabase.from("discoveries").delete().eq("room_id", room.id);
    await supabase.from("players").update({ power_used: false }).eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({
        phase: "lobby",
        round: 0,
        confidence: 100,
        current_suspect: null,
        revealed: [],
        verdict: null,
        timer_ends_at: null,
      })
      .eq("id", room.id);
  };

  const topCause = Object.entries(causeVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <main className="noir-grain mx-auto max-w-[1600px] px-4 py-5 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label-caps">Case · Casa Fuego Madrid</div>
          <h1 className="font-display text-3xl uppercase leading-none md:text-4xl">
            Who killed the <span className="text-primary">go-live?</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="label-caps">Room code</div>
            <div className="font-display text-4xl tracking-[0.3em] text-primary md:text-5xl">
              {room.code}
            </div>
          </div>
          <span className="tape px-3 py-1 font-display text-xs font-semibold uppercase tracking-[0.2em]">
            8–10 min
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="space-y-5">
          <div className="panel flex flex-wrap items-end justify-between gap-6 p-5">
            <div>
              <div className="label-caps">{PHASE_LABEL[phase] ?? phase}</div>
              <div className="mt-1 font-display text-2xl uppercase md:text-3xl">
                {phase === "lobby" && "Waiting for detectives"}
                {phase === "briefing" && "Read the crime scene"}
                {phase === "initial" && "Go / Conditional / No-Go"}
                {phase === "investigate" && "The team is on the floor"}
                {phase === "connect" && "Who or what killed it?"}
                {phase === "verdict" && "Deliver the verdict"}
                {phase === "reveal" && "The killer"}
              </div>
            </div>
            <div className="w-56">
              <Timer endsAt={room.timer_ends_at} total={PHASE_SECONDS[phase] ?? 60} />
            </div>
          </div>

          {phase === "lobby" && (
            <div className="panel p-6">
              <p className="text-lg text-muted-foreground">
                Detectives join at the landing page with code{" "}
                <span className="font-display tracking-[0.3em] text-primary">{room.code}</span>.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <div key={r.id} className="rounded-md border border-border p-3">
                    <div className="font-display uppercase tracking-wide">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.brief}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "briefing" && (
            <div className="panel p-6 md:p-8">
              <p className="font-display text-2xl uppercase leading-tight text-primary md:text-4xl">
                {BRIEFING_LINE}
              </p>
              <ul className="mt-6 space-y-3">
                {CASE_FACTS.map((f) => (
                  <li key={f} className="flex gap-3 text-base text-foreground/90 md:text-lg">
                    <span className="text-primary">—</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase === "initial" && (
            <div className="panel p-6">
              <div className="label-caps">First instinct — before any evidence</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {INITIAL_OPTIONS.map((o) => (
                  <div key={o} className="rounded-md border border-border p-4 text-center">
                    <div className="font-display text-4xl text-primary">{initialVotes[o] ?? 0}</div>
                    <div className="label-caps mt-1">{o}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {onMap && (
            <MapCanvas
              roomId={room.id}
              self={null}
              found={new Set(discoveries.map((d) => `${d.object_id}:${d.step}`))}
              selectedId={selected}
              onSelect={setSelected}
              frozen
            />
          )}

          {phase === "connect" && (
            <div className="panel p-5">
              <div className="label-caps">Primary cause · team vote</div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {SUSPECTS.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-md border p-3 text-center ${
                      topCause === s.id ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <div className="font-display text-3xl">{causeVotes[s.id] ?? 0}</div>
                    <div className="label-caps mt-1 leading-tight">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "verdict" && (
            <div className="panel p-6">
              <div className="label-caps">Final verdict vote</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {INITIAL_OPTIONS.map((o) => (
                  <div key={o} className="rounded-md border border-border p-4 text-center">
                    <div className="font-display text-4xl text-primary">{verdictVotes[o] ?? 0}</div>
                    <div className="label-caps mt-1">{o}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "reveal" && (
            <div className="panel p-6 md:p-10">
              <div className="label-caps">Case closed · 18:42</div>
              <p className="mt-3 font-display text-4xl uppercase leading-tight md:text-6xl">
                The killer was <span className="text-primary">Partner Assumption.</span>
              </p>
              <p className="mt-4 font-display text-2xl uppercase leading-tight text-evidence md:text-4xl">
                The weapon was a checklist with no evidence.
              </p>
              <p className="mt-8 font-display text-3xl uppercase tracking-[0.15em] md:text-5xl">
                No evidence, no go-live.
              </p>
              <p className="mt-6 max-w-3xl text-lg text-foreground/85 md:text-xl">{CLOSING_LINE}</p>
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                <Fact label="Accomplices" value="Payments · Network · Configuration · PMS Scope" />
                <Fact label="Falsely accused" value="Printer — the hardware was always fine" />
                <Fact label="Team verdict" value={`${band.label} · confidence ${room.confidence}`} />
                <Fact
                  label="Evidence proven"
                  value={`${discoveries.length} of ${TOTAL_STEPS} findings · ${blockers.length} blockers`}
                />
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="panel p-5">
            <ConfidenceMeter value={room.confidence} />
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[-25, -10, +5, +15].map((d) => (
                <button
                  key={d}
                  onClick={() => void nudge(d)}
                  className="rounded-md border border-border py-2 font-display text-sm hover:border-primary hover:text-primary"
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <button
              onClick={() => void advance()}
              disabled={phase === "reveal"}
              className="w-full rounded-md bg-primary px-4 py-3 font-display text-lg uppercase tracking-wider text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {NEXT_LABEL[phase] ?? "Advance"}
            </button>
            <button
              onClick={() => setBoard(true)}
              className="mt-2 w-full rounded-md border border-border px-4 py-2.5 font-display uppercase tracking-wider hover:border-primary hover:text-primary"
            >
              Evidence board
            </button>
            <button
              onClick={() => void setPhase("reveal")}
              className="mt-2 w-full rounded-md border border-border px-4 py-2.5 font-display uppercase tracking-wider hover:border-primary hover:text-primary"
            >
              Jump to final reveal
            </button>
            <button
              onClick={() => void restart()}
              className="mt-2 w-full rounded-md border border-destructive/50 px-4 py-2.5 font-display uppercase tracking-wider text-destructive hover:bg-destructive/10"
            >
              Restart case
            </button>
          </div>

          <DiscoveryFeed discoveries={discoveries} total={TOTAL_STEPS} compact />

          <div className="panel p-5">
            <div className="label-caps">Detectives · {detectives.length}</div>
            <ul className="mt-3 space-y-2">
              {detectives.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {roleById(p.role)?.name ?? "—"}
                    {p.power_used ? " · power used" : ""}
                  </span>
                </li>
              ))}
              {detectives.length === 0 && (
                <li className="text-sm text-muted-foreground">Nobody has joined yet.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {selected && (
        <InspectPanel
          objectId={selected}
          found={new Set(discoveries.map((d) => `${d.object_id}:${d.step}`))}
          role={null}
          near={false}
          readOnly
          onClose={() => setSelected(null)}
          onRun={() => {}}
        />
      )}
      {board && <EvidenceBoard discoveries={discoveries} onClose={() => setBoard(false)} />}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="label-caps">{label}</div>
      <div className="mt-1 text-base text-foreground/90">{value}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <p className="font-display text-2xl uppercase text-muted-foreground">{children}</p>
    </main>
  );
}
