import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newRoomCode, ROLES } from "@/lib/game";
import { storePlayerId } from "@/lib/room";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Who Killed the Go-Live? — K-Series Launch Mystery" },
      {
        name: "description",
        content:
          "A 8–10 minute multiplayer murder mystery for launch teams. Investigate the Casa Fuego Madrid go-live, classify the evidence and deliver the verdict together.",
      },
      { property: "og:title", content: "Who Killed the Go-Live?" },
      {
        property: "og:description",
        content:
          "A live 8–10 minute Cluedo-style investigation for K-Series launch teams. Create a room, share the code, find the killer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"none" | "join">("none");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[0]!.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    setBusy(true);
    setError(null);
    const roomCode = newRoomCode();
    const { data: room, error: e1 } = await supabase
      .from("rooms")
      .insert({ code: roomCode })
      .select()
      .single();
    if (e1 || !room) {
      setError("Could not open the case file. Try again.");
      setBusy(false);
      return;
    }
    const { data: host } = await supabase
      .from("players")
      .insert({ room_id: room.id, name: "Game Master", is_host: true })
      .select()
      .single();
    if (host) storePlayerId(roomCode, host.id);
    void navigate({ to: "/host/$code", params: { code: roomCode } });
  }

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const c = code.trim().toUpperCase();
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", c)
      .maybeSingle();
    if (!room) {
      setError("No investigation found with that code.");
      setBusy(false);
      return;
    }
    const { data: player } = await supabase
      .from("players")
      .insert({ room_id: room.id, name: name.trim() || "Detective", role })
      .select()
      .single();
    if (!player) {
      setError("Could not join. Try again.");
      setBusy(false);
      return;
    }
    storePlayerId(c, player.id);
    void navigate({ to: "/play/$code", params: { code: c } });
  }

  return (
    <main className="noir-grain relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <span className="tape px-3 py-1 font-display text-xs font-semibold uppercase tracking-[0.2em]">
          8–10 min
        </span>
        <span className="label-caps">K-Series · Launch Forensics · Casa Fuego Madrid</span>
      </div>

      <h1 className="mt-6 max-w-4xl font-display text-5xl uppercase leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
        Who killed the
        <span className="block text-primary">go-live?</span>
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        The launch was scheduled for tomorrow at 10:00. At 18:42 it was found dead. Assemble your
        detectives, interrogate eight suspects, classify the evidence and deliver a verdict before
        the private event begins.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="panel noir-grain p-6">
          <div className="label-caps">Game Master</div>
          <h2 className="mt-1 font-display text-2xl uppercase">Create investigation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Opens a case file with a 6-character room code. Share your screen — you control the
            reveals, the timer and the confidence meter.
          </p>
          <button
            onClick={createRoom}
            disabled={busy}
            className="mt-5 w-full rounded-md bg-primary px-5 py-3 font-display text-lg uppercase tracking-wider text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            Open the case file
          </button>
        </div>

        <div className="panel noir-grain p-6">
          <div className="label-caps">Detective</div>
          <h2 className="mt-1 font-display text-2xl uppercase">Join investigation</h2>
          {mode === "none" ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the room code your Game Master is showing and pick your speciality.
              </p>
              <button
                onClick={() => setMode("join")}
                className="mt-5 w-full rounded-md border border-primary/60 px-5 py-3 font-display text-lg uppercase tracking-wider text-primary transition hover:bg-primary/10"
              >
                Enter a room code
              </button>
            </>
          ) : (
            <form onSubmit={joinRoom} className="mt-4 space-y-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                required
                className="w-full rounded-md border border-input bg-background/60 px-4 py-3 text-center font-display text-2xl uppercase tracking-[0.4em] outline-none focus:border-primary"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-md border border-input bg-background/60 px-4 py-3 outline-none focus:border-primary"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                      role === r.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="font-display uppercase tracking-wide">{r.name}</span>
                  </button>
                ))}
              </div>
              <button
                disabled={busy}
                className="w-full rounded-md bg-primary px-5 py-3 font-display text-lg uppercase tracking-wider text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                Join the investigation
              </button>
            </form>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-12 grid gap-5 border-t border-border pt-8 md:grid-cols-3">
        {[
          ["01 · Brief", "The Game Master shares the screen and reads the case. Everyone joins with a role."],
          ["02 · Investigate", "Four rounds. Vote a suspect, see the evidence, classify it: blocker, workaround, out of scope or noise."],
          ["03 · Verdict", "The confidence meter decides: GO, Conditional Go, High Risk or No-Go. Then the killer is revealed."],
        ].map(([t, d]) => (
          <div key={t}>
            <div className="font-display text-sm uppercase tracking-[0.2em] text-primary">{t}</div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
