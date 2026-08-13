import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readPlayerId, storePlayerId, useCountdown, useRoom } from "@/lib/room";
import { usePrivateCase } from "@/lib/play-state";
import {
  ALL_EVIDENCE,
  ESCALATION_ORDER,
  GAME_SECONDS,
  OPENING_ORDER,
  SOCRATIC,
  ZONES,

  isCorrect,
  objectById,
  scoreRun,
  type Accusation,
  type Action,
} from "@/lib/case";
import { CasaMap, type MapAvatar } from "@/components/casa/CasaMap";
import { InspectCard } from "@/components/casa/InspectCard";
import { EvidenceBoardPanel } from "@/components/casa/EvidenceBoardPanel";
import { AccuseWizard } from "@/components/casa/AccuseWizard";
import { Debrief } from "@/components/casa/Debrief";
import { CharacterSelect } from "@/components/casa/CharacterSelect";
import { INVESTIGATORS, investigatorById } from "@/lib/investigators";
import { logEvent } from "@/lib/host-live";


export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "Detective Console — Who Killed the Go-Live?" },
      {
        name: "description",
        content:
          "Your private Casa Fuego investigation: explore the restaurant, collect evidence and accuse before the timer runs out.",
      },
      { property: "og:title", content: "Detective Console — Casa Fuego" },
      {
        property: "og:description",
        content: "Explore, collect evidence, accuse. Three attempts. Save the go-live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerScreen,
});

function PlayerScreen() {
  const { code } = Route.useParams();
  const { room, players, loading, missing } = useRoom(code);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [story, setStory] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [board, setBoard] = useState(false);
  const [accusing, setAccusing] = useState(false);
  const [result, setResult] = useState<"wrong" | "saved" | null>(null);
  const [resetAsk, setResetAsk] = useState(false);
  const [alertOn, setAlertOn] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [optimisticZone, setOptimisticZone] = useState<string | null>(null);
  const { state, record, reset, escalate } = usePrivateCase(code, playerId);
  const left = useCountdown(room?.timer_ends_at ?? null);

  useEffect(() => setPlayerId(readPlayerId(code)), [code]);

  const me = players.find((p) => p.id === playerId && !p.is_host) ?? null;
  const running = room?.phase === "running";

  const join = async (investigatorId: string) => {
    if (!room) return;
    setJoining(true);
    setJoinError(null);
    const inv = INVESTIGATORS.find((i) => i.id === investigatorId);
    const { data, error } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: inv?.name ?? "Detective",
        role: investigatorId,
        status: "lobby",
        zone: "restaurant",
      })
      .select()
      .single();
    if (error || !data) {
      setJoinError("That investigator was just taken. Pick another one.");
      setJoining(false);
      return;
    }
    storePlayerId(code, data.id);
    setPlayerId(data.id);
    setJoining(false);
  };

  const goZone = (zoneId: string) => {
    if (!me || !room) return;
    const current = optimisticZone ?? me.zone;
    if (current === zoneId) return;
    setOptimisticZone(zoneId); // optimistic: move the standee right away
    void supabase.from("players").update({ zone: zoneId }).eq("id", me.id);
    logEvent({
      room_id: room.id,
      player_id: me.id,
      player_name: me.name,
      role: me.role,
      kind: "move",
      message: `moved to ${ZONES.find((z) => z.id === zoneId)?.name ?? zoneId}`,
    });
  };

  // drop the optimistic zone once the server confirms it
  useEffect(() => {
    if (optimisticZone && me?.zone === optimisticZone) setOptimisticZone(null);
  }, [me?.zone, optimisticZone]);



  // mid-game escalation
  useEffect(() => {
    if (!running || state.escalated) return;
    if ((left !== null && left <= 150) || state.found.length >= 6) {
      escalate();
      setAlertOn(true);
    }
  }, [running, left, state.escalated, state.found.length, escalate]);

  // time out
  useEffect(() => {
    if (!me || !running || left === null || left > 0) return;
    if (me.status === "investigating" || me.status === "lobby") {
      void supabase.from("players").update({ status: "timeout" }).eq("id", me.id);
    }
  }, [left, me, running]);

  // sync private investigation progress to the backend (Host monitoring only)
  const foundKey = state.found.join(",");
  const doneKey = state.done.join(",");
  useEffect(() => {
    if (!me) return;
    const sameFound = (me.found_ids ?? []).join(",") === foundKey;
    const sameDone = (me.done_ids ?? []).join(",") === doneKey;
    if (sameFound && sameDone && me.evidence_count === state.found.length) return;
    void supabase
      .from("players")
      .update({
        evidence_count: state.found.length,
        found_ids: state.found,
        done_ids: state.done,
      })
      .eq("id", me.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundKey, doneKey, me?.id]);

  if (loading) return <Shell>Connecting to Casa Fuego…</Shell>;
  if (missing || !room) return <Shell>No investigation found for code {code}.</Shell>;
  if (!me)
    return (
      <CharacterSelect
        code={code}
        takenRoles={players.filter((p) => !p.is_host && p.role).map((p) => p.role as string)}
        busy={joining}
        error={joinError}
        onJoin={(investigatorId) => void join(investigatorId)}
      />
    );

  const attemptsLeft = 3 - me.attempts_used;
  const confidence = state.escalated ? 45 : 70;
  const solvedCount = players.filter((p) => p.status === "saved").length;
  const detectives = players.filter((p) => !p.is_host);
  const myInv = investigatorById(me.role);
  const avatars: MapAvatar[] = detectives
    .map((p) => {
      const inv = investigatorById(p.role);
      const isMe = p.id === me.id;
      const zone = (isMe ? (optimisticZone ?? p.zone) : p.zone) ?? "restaurant";
      return inv ? { id: p.id, zone, isMe, inv } : null;
    })
    .filter((a): a is MapAvatar => a !== null);


  const runAction = (a: Action) => {
    if (state.done.includes(a.id)) return;
    record(a.id, a.evidence?.id);
    const obj = selected ? objectById(selected) : null;
    logEvent({
      room_id: room.id,
      player_id: me.id,
      player_name: me.name,
      role: me.role,
      kind: a.evidence ? "evidence" : "action",
      message: a.evidence
        ? `discovered evidence: ${a.evidence.title}${obj ? ` (${obj.name})` : ""}`
        : `performed ${a.label}${obj ? ` on ${obj.name}` : ""}`,
    });
  };

  const submit = async (a: Accusation) => {
    const ok = isCorrect(a);
    const attempts = me.attempts_used + 1;
    const secondsLeft = left ?? 0;
    await supabase.from("accusations").insert({
      room_id: room.id,
      player_id: me.id,
      player_name: me.name,
      role: me.role,
      attempt: attempts,
      what: a.what,
      root: a.root,
      killer: a.killer,
      weapon: a.weapon,
      decision: a.decision,
      correct: ok,
    });
    logEvent({
      room_id: room.id,
      player_id: me.id,
      player_name: me.name,
      role: me.role,
      kind: ok ? "saved" : attempts >= 3 ? "fired" : "wrong",
      message: ok
        ? `SAVED THE GO-LIVE on attempt ${attempts}/3`
        : attempts >= 3
          ? `wrong accusation (attempt ${attempts}/3) — FIRED`
          : `wrong accusation (attempt ${attempts}/3)`,
    });
    if (ok) {
      const score = scoreRun({
        a,
        foundIds: state.found,
        secondsLeft,
        wrongAttempts: attempts - 1,
        interactions: state.interactions,
      });
      await supabase
        .from("players")
        .update({
          attempts_used: attempts,
          status: "saved",
          score,
          decision: a.decision,
          solved_at: new Date().toISOString(),
          finish_seconds: GAME_SECONDS - secondsLeft,
          evidence_count: state.found.length,
          red_herrings: state.found.filter((id) =>
            ALL_EVIDENCE.some((e) => e.id === id && e.kind === "herring"),
          ).length,
        })
        .eq("id", me.id);
      setAccusing(false);
      setResult("saved");
      return;
    }
    const fired = attempts >= 3;
    await supabase
      .from("players")
      .update({
        attempts_used: attempts,
        status: fired ? "fired" : "investigating",
        score: Math.max(0, me.score - 150),
        evidence_count: state.found.length,
      })
      .eq("id", me.id);
    setAccusing(false);
    setResult("wrong");
  };

  /* ── screens ─────────────────────────────────────────────── */

  if (room.phase === "ended" || (me.status === "timeout" && !running))
    return <EndScreen players={detectives} />;

  if (!entered) return <RulesScreen onEnter={() => setEntered(true)} started={running} />;

  if (!running)
    return (
      <Shell>
        <span className="block">You're in. Waiting for the Game Master to start.</span>
        <span className="mt-3 block text-lg text-muted-foreground">
          {detectives.length} implementer{detectives.length === 1 ? "" : "s"} on the scene.
        </span>
      </Shell>
    );

  if (me.status === "lobby") {
    void supabase.from("players").update({ status: "investigating" }).eq("id", me.id);
  }

  if (me.status === "saved" && result !== null)
    return (
      <SuccessScreen
        score={me.score}
        seconds={me.finish_seconds ?? 0}
        attempts={me.attempts_used}
        evidence={state.found.length}
        decision={me.decision ?? "conditional"}
        solvedCount={solvedCount}
        total={detectives.length}
      />
    );

  if (me.status === "saved")
    return (
      <SuccessScreen
        score={me.score}
        seconds={me.finish_seconds ?? 0}
        attempts={me.attempts_used}
        evidence={state.found.length}
        decision={me.decision ?? "conditional"}
        solvedCount={solvedCount}
        total={detectives.length}
      />
    );

  if (me.status === "fired") return <FiredScreen solvedCount={solvedCount} total={detectives.length} />;

  if (story)
    return <OpeningStory onDone={() => setStory(false)} />;

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#0b0e14]">
      {/* ── top bar ─────────────────────────────────────────── */}
      <header className="z-30 flex shrink-0 items-center gap-4 border-b border-white/10 bg-[#11151d] px-4 py-2">
        <div className="hidden items-center gap-2 md:flex">
          {["🔎 Investigate", "🧠 Connect", "🚨 Accuse"].map((s, i) => (
            <span
              key={s}
              className={`rounded-full border px-3 py-1 font-display text-[11px] uppercase tracking-[0.18em] ${
                i === 0 ? "border-primary/70 text-primary" : "border-white/10 text-white/40"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mx-auto flex items-center gap-3">
          <span className="label-caps text-[10px]">⏱ Time left</span>
          <span className="font-display text-4xl tabular-nums leading-none text-primary">
            {fmt(left)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="label-caps text-[11px]">👥 {detectives.length}</span>
          <span className="label-caps text-[11px] text-go">
            🟢 {solvedCount}/{detectives.length} saved
          </span>
          <button
            onClick={() => setResetAsk(true)}
            title="Reset investigation"
            className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:border-primary"
          >
            ⚙️
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── left panel ───────────────────────────────────── */}
        <aside className="hidden w-[22%] min-w-[240px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-white/10 bg-[#11151d] p-4 lg:flex">
          <div>
            <div className="label-caps text-[10px]">Room {room.code}</div>
            <h1 className="font-display text-2xl uppercase leading-none">
              Who killed the <span className="text-primary">go-live?</span>
            </h1>
          </div>

          {myInv && (
            <div className="panel flex items-center gap-3 p-3">
              <div
                className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 bg-black/40"
                style={{ borderColor: myInv.accent }}
              >
                <img
                  src={myInv.portrait}
                  alt={myInv.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm uppercase leading-tight">{myInv.name}</div>
                <div className="label-caps text-[10px]" style={{ color: myInv.accent }}>
                  {myInv.icon} {myInv.role}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat k="Evidence" v={`${state.found.length}`} />
            <Stat k="Score" v={`${me.score}`} />
            <Stat k="Attempts" v={"❤️".repeat(attemptsLeft) || "—"} />

          </div>

          <div className="panel p-3">
            <div className="label-caps text-[10px]">On the scene</div>
            <ul className="mt-2 space-y-1.5">
              {avatars.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: a.inv.accent }}
                    aria-hidden
                  />
                  <span className={a.isMe ? "text-primary" : "text-white/70"}>{a.inv.short}</span>
                  <span className="ml-auto text-white/35">
                    {ZONES.find((z) => z.id === a.zone)?.name ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setBoard(true)}
            className="rounded-md border border-white/15 px-3 py-2.5 font-display text-sm uppercase hover:border-primary hover:text-primary"
          >
            🗂️ Evidence board
          </button>
          <button
            onClick={() => setAccusing(true)}
            className="rounded-md bg-destructive px-4 py-3 font-display text-base uppercase tracking-wider text-destructive-foreground hover:brightness-110"
          >
            🚨 Save the go-live
          </button>
        </aside>

        {/* ── map ──────────────────────────────────────────── */}
        <div className="relative min-h-0 min-w-0 flex-1 bg-[#0b0e14] p-3">
          <CasaMap
            found={state.found}
            doneActions={state.done}
            selected={selected}
            avatars={avatars}
            myZone={optimisticZone ?? me.zone ?? null}
            onZone={goZone}
            onSelect={setSelected}
          />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/75 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            Click a room to move · click any glowing object · 🔎 Inspect · 📡 Ping · 🔗 Trace · 🧪
            Test
          </div>
          <div className="absolute right-4 top-4 flex gap-2 lg:hidden">
            <button
              onClick={() => setBoard(true)}
              className="rounded-md border border-white/15 bg-black/70 px-3 py-1.5 font-display text-xs uppercase"
            >
              🗂️
            </button>
            <button
              onClick={() => setAccusing(true)}
              className="rounded-md bg-destructive px-3 py-1.5 font-display text-xs uppercase text-destructive-foreground"
            >
              🚨 Accuse
            </button>
          </div>
        </div>
      </div>

      {/* ── bottom HUD ─────────────────────────────────────── */}
      <footer className="z-30 flex shrink-0 flex-wrap items-center gap-4 border-t border-white/10 bg-[#11151d] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="label-caps text-[10px]">Go-live confidence</span>
          <div className="h-2 w-36 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${confidence >= 60 ? "bg-warn" : "bg-nogo"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="font-display text-sm">{confidence}%</span>
        </div>
        <div className="label-caps text-[11px]">🔎 Evidence found · {state.found.length}</div>
        <div className="label-caps text-[11px]">
          📍 {ZONES.find((z) => z.id === (optimisticZone ?? me.zone ?? "restaurant"))?.name ?? "Dining Room"}
        </div>
        <div className="ml-auto truncate text-xs text-muted-foreground">
          {state.escalated
            ? "🚨 Table 8 order failed — confidence dropped to 45%."
            : "19:07 · 23 minutes to launch · the ribeye never printed."}
        </div>
      </footer>


      {selected && objectById(selected) && (
        <InspectCard
          objectId={selected}
          done={state.done}
          found={state.found}
          onRun={runAction}
          onClose={() => setSelected(null)}
        />
      )}
      {board && <EvidenceBoardPanel found={state.found} onClose={() => setBoard(false)} />}
      {accusing && (
        <AccuseWizard
          attemptsLeft={attemptsLeft}
          onCancel={() => setAccusing(false)}
          onSubmit={(a) => void submit(a)}
        />
      )}
      {result === "wrong" && (
        <WrongScreen attemptsLeft={3 - me.attempts_used} onBack={() => setResult(null)} />
      )}
      {alertOn && <EscalationAlert onClose={() => setAlertOn(false)} />}
      {resetAsk && (
        <Modal>
          <h2 className="font-display text-2xl uppercase">Reset investigation?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This clears your discovered evidence, your evidence board, opened rooms and performed
            tests. It does NOT restore used attempts, does not reset the shared timer and does not
            affect anyone else.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setResetAsk(false)}
              className="rounded-md border border-border px-4 py-2 font-display uppercase"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                reset();
                void supabase
                  .from("players")
                  .update({ evidence_count: 0, found_ids: [], done_ids: [] })
                  .eq("id", me.id);
                logEvent({
                  room_id: room.id,
                  player_id: me.id,
                  player_name: me.name,
                  role: me.role,
                  kind: "reset",
                  message: "reset their investigation (attempts kept)",
                });
                setResetAsk(false);
                setSelected(null);
              }}
              className="rounded-md bg-primary px-5 py-2 font-display uppercase text-primary-foreground"
            >
              Reset
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* ── sub-screens ───────────────────────────────────────────── */

function RulesScreen({ onEnter, started }: { onEnter: () => void; started: boolean }) {
  return (
    <main className="noir-grain mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-10">
      <h1 className="font-display text-5xl uppercase leading-none text-primary">🔥 Save the go-live</h1>
      <div className="mt-6 space-y-3">
        {[
          ["1 🔎", "INVESTIGATE", "Explore Casa Fuego. Click glowing objects and collect evidence."],
          ["2 🧠", "CONNECT", "Work out WHAT failed, WHERE, WHO killed the go-live and HOW."],
          ["3 🚨", "ACCUSE", "Submit your theory when ready."],
        ].map(([n, t, d]) => (
          <div key={t} className="panel flex items-center gap-4 p-4">
            <div className="font-display text-3xl">{n}</div>
            <div>
              <div className="font-display text-2xl uppercase leading-none">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 font-display text-3xl uppercase">
        ❤️❤️❤️ You have 3 attempts. Three wrong accusations = you're fired.
      </p>
      <p className="mt-2 font-display text-2xl uppercase text-evidence">
        🏆 Highest score wins. Speed matters, but proof matters more.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        🔄 Reset clears your investigation, NOT your used attempts.
      </p>
      <button
        onClick={onEnter}
        className="mt-7 rounded-md bg-primary px-6 py-4 font-display text-2xl uppercase tracking-wider text-primary-foreground hover:brightness-110"
      >
        Enter Casa Fuego
      </button>
      {!started && (
        <p className="mt-3 text-sm text-muted-foreground">
          The Game Master hasn't started yet — you can read this twice.
        </p>
      )}
    </main>
  );
}

function OpeningStory({ onDone }: { onDone: () => void }) {
  return (
    <main className="noir-grain mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-10">
      <div className="label-caps">Casa Fuego Madrid · 19:07 · 23 minutes to the private event</div>
      <h1 className="mt-2 font-display text-4xl uppercase leading-none md:text-5xl">
        New partner. Checklist says <span className="text-go">ready</span>.
      </h1>
      <div className="panel mt-5 p-4">
        <div className="label-caps">First real test order</div>
        <ul className="mt-3 space-y-2 font-display text-xl uppercase">
          {OPENING_ORDER.map((o) => (
            <li key={o.item} className="flex items-center gap-3">
              <span className="text-2xl">{o.icon}</span>
              <span className="w-40">{o.item}</span>
              <span className="text-muted-foreground">→ {o.to}</span>
              <span className={o.ok ? "text-go" : "text-nogo"}>{o.ok ? "✅" : "❌"}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 rounded-md border border-border bg-black/30 p-4 font-mono text-sm text-foreground/85">
        PARTNER: “All printers were tested yesterday. Everything was green. We followed the
        checklist.”
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="label-caps">Go-live confidence</span>
        <div className="h-3 w-56 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[70%] bg-warn" />
        </div>
        <span className="font-display text-xl">70%</span>
      </div>
      <p className="mt-5 font-display text-3xl uppercase text-primary">
        Something in Casa Fuego is lying.
      </p>
      <button
        onClick={onDone}
        className="mt-6 rounded-md bg-primary px-6 py-4 font-display text-2xl uppercase tracking-wider text-primary-foreground hover:brightness-110"
      >
        Start investigating
      </button>
    </main>
  );
}

function EscalationAlert({ onClose }: { onClose: () => void }) {
  return (
    <Modal>
      <div className="label-caps text-destructive">🚨 New order received</div>
      <h2 className="font-display text-3xl uppercase leading-none">Table 8</h2>
      <ul className="mt-4 space-y-2 font-display text-xl uppercase">
        {ESCALATION_ORDER.map((o) => (
          <li key={o.item} className="flex items-center gap-3">
            <span className="text-2xl">{o.icon}</span>
            <span className="w-52">{o.item}</span>
            <span className={o.ok ? "text-go" : "text-nogo"}>{o.ok ? "✅" : "❌"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-display text-2xl uppercase text-nogo">
        Go-live confidence drops to 45%
      </p>
      <button
        onClick={onClose}
        className="mt-5 rounded-md bg-primary px-5 py-3 font-display uppercase text-primary-foreground"
      >
        Back to Casa Fuego
      </button>
    </Modal>
  );
}

function WrongScreen({ attemptsLeft, onBack }: { attemptsLeft: number; onBack: () => void }) {
  const hint = SOCRATIC[(3 - attemptsLeft - 1 + SOCRATIC.length) % SOCRATIC.length];
  return (
    <Modal>
      <h2 className="font-display text-4xl uppercase leading-none text-nogo">❌ Wrong accusation</h2>
      <p className="mt-3 font-display text-xl uppercase">
        Your theory does not explain all available evidence.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
      <p className="mt-4 font-display text-3xl">
        {"❤️".repeat(attemptsLeft)}
        {"🖤".repeat(3 - attemptsLeft)}
      </p>
      {attemptsLeft === 1 && (
        <p className="mt-2 font-display text-2xl uppercase text-destructive">⚠️ Final attempt</p>
      )}
      <button
        onClick={onBack}
        className="mt-5 rounded-md bg-primary px-5 py-3 font-display uppercase text-primary-foreground"
      >
        Return to Casa Fuego
      </button>
    </Modal>
  );
}

function FiredScreen({ solvedCount, total }: { solvedCount: number; total: number }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl">💀</div>
      <h1 className="mt-4 font-display text-6xl uppercase leading-none text-nogo">Access revoked</h1>
      <p className="mt-3 font-display text-4xl uppercase">You're fired</p>
      <p className="mt-2 font-display text-2xl uppercase text-muted-foreground">Pack your laptop</p>
      <p className="mt-4 text-lg text-foreground/80">“Sander would like a quick chat.”</p>
      <p className="mt-8 label-caps">
        🟢 {solvedCount}/{total} implementers have saved Casa Fuego
      </p>
    </main>
  );
}

function SuccessScreen({
  score,
  seconds,
  attempts,
  evidence,
  decision,
  solvedCount,
  total,
}: {
  score: number;
  seconds: number;
  attempts: number;
  evidence: number;
  decision: string;
  solvedCount: number;
  total: number;
}) {
  return (
    <main className="noir-grain mx-auto min-h-screen max-w-3xl px-5 py-10">
      <div className="label-caps">🔥 Casa Fuego — Go-live recovery report</div>
      <h1 className="mt-1 font-display text-5xl uppercase leading-none text-go">Go-live saved</h1>
      <div className="panel mt-5 space-y-2 p-5 font-display text-lg uppercase">
        <Row k="Root cause" v="⚙️ Incorrect accounting group mapping" />
        <Row k="Failed items" v="🥩 Ribeye · 🐙 Grilled octopus · 🐖 Iberian pork" />
        <Row k="Killer" v="👤 Partner assumption" />
        <Row k="Weapon" v="📋 Checklist without evidence" />
        <Row k="Recovery" v="🔧 Correct mapping → 🧪 E2E validation → 📎 Evidence attached" />
        <Row
          k="Decision"
          v={decision === "conditional" ? "🟠 Conditional go → 🟢 GO" : decision.toUpperCase()}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat k="Time" v={fmt(seconds)} />
        <Stat k="Attempts" v={`${attempts}/3`} />
        <Stat k="Evidence" v={String(evidence)} />
        <Stat k="Score" v={String(score)} />
      </div>
      <p className="mt-6 label-caps">
        🟢 {solvedCount}/{total} implementers have saved Casa Fuego
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Stay on this screen — the Game Master will reveal the full debrief and leaderboard.
      </p>
    </main>
  );
}

function EndScreen({ players }: { players: { id: string; name: string; score: number; status: string; finish_seconds: number | null }[] }) {
  const ranked = [...players].sort(
    (a, b) => b.score - a.score || (a.finish_seconds ?? 9999) - (b.finish_seconds ?? 9999),
  );
  return (
    <main className="noir-grain mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Debrief />
      <div className="panel mt-6 p-5">
        <div className="label-caps">Final leaderboard</div>
        <ol className="mt-3 space-y-2">
          {ranked.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-3 font-display text-lg uppercase">
              <span>
                {i + 1}. {p.name} {p.status === "fired" ? "💀" : p.status === "saved" ? "🏆" : "⏳"}
              </span>
              <span className="text-primary">{p.score}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

/* ── bits ──────────────────────────────────────────────────── */

const fmt = (s: number | null) =>
  s === null ? "--:--" : `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <span className="w-40 text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="label-caps text-[10px]">{k}</div>
      <div className="font-display text-2xl">{v}</div>
    </div>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
      <div className="panel noir-grain w-full max-w-lg p-6 text-center">{children}</div>
    </div>
  );
}


function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="font-display text-2xl uppercase text-muted-foreground">{children}</div>
    </main>
  );
}

// keep import used for typing clarity
export type { Accusation };
