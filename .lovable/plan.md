# Casa Fuego — Top-Down Investigation Map

Transform the investigation phase from a card/vote flow into a shared, explorable 2D restaurant. Everything else (rooms, roles, host controls, timer sync, reconnect, reveal, noir identity) stays.

Yes, Lovable is an appropriate path: this is a 2D DOM/SVG + CSS-transform map with Supabase Realtime for movement — no game engine, no paid services.

## What is reused as-is

- `rooms` / `players` / `votes` tables and the public no-login policies.
- `useRoom` in `src/lib/room.ts` (room + players + votes realtime), `readPlayerId` / `storePlayerId` reconnect, `castVote`, `tally`, `useCountdown`.
- `Timer`, `ConfidenceMeter`, noir tokens in `src/styles.css`, landing page, join/late-join flow.
- Host phase machine in `host.$code.tsx` (`setPhase`, `advance`, `restart`) and the confidence/verdict logic in `src/lib/game.ts`.
- Suspects data — repurposed as the *conclusions* the evidence points at, not as clickable question cards.

## What changes

1. **Phase timings** retuned to the sub-10-min target: briefing 45s, `investigate` 4.5 min (replaces rounds 1–4), `connect` 2 min, verdict + reveal 1–2 min. Same `phase`/`timer_ends_at` columns, so sync and reconnect are untouched.
2. **New investigation phase UI**: the map is the whole screen for players; the host gets the same map read-only plus its existing control rail (timer, feed, confidence nudges, advance, restart, final reveal).
3. **Suspect-vote round loop retired** during investigation; suspect voting survives only in the `connect` phase (team links discoveries to conclusions) and the final Go/No-Go verdict.
4. `EvidenceCard` becomes the body of the inspection panel and the evidence board entry, keeping the `showAnswer` gating.

## The map

Single fixed-aspect scene (~1600x900 world units) scaled to fit, five zones: Restaurant floor, Bar, Kitchen, Reception / Hotel front desk, Back office. Rendered as absolutely-positioned divs over an SVG floor plan — warm wood/terracotta surfaces under the existing noir vignette so it reads as a restaurant.

Interactive objects (each with zone, position, icon, role affinity): tables 1–6, POS station, service iPad, kitchen printer, bar printer, KDS screen, payment terminal, router + guest AP, PMS terminal, configuration workstation, go-live checklist binder, staff NPCs (waiter, chef, receptionist), plus flavour props.

Movement: WASD/arrows plus click-to-walk, ~8px/frame with simple rect collision against walls and object footprints. Avatars are coloured discs with initials, role ring and name tag.

## Multiplayer movement

Positions go over a **Supabase Realtime broadcast channel** (`map-<roomId>`), throttled to ~10 msg/s per player, never written to Postgres. Remote avatars interpolate between packets. Presence handles disappearance on disconnect. No new writes on the hot path, so DB load is unchanged and reconnect just rejoins the channel.

## Progressive discovery model

Each object has 1–3 **steps**. Step 1 is a passive inspection; later steps are actions that often contradict the first result.

- Kitchen printer: test page prints fine -> *fire a real hot-food order* -> ticket lands at the Bar printer.
- Payment terminal: standalone sale approved -> *request integrated sale from POS* -> acquirer activation pending.
- PMS terminal: room-charge menu exists -> *post a test charge* -> no interface user / no credentials.
- Checklist binder: 12/12 complete -> *open evidence fields* -> zero screenshots, zero test IDs, zero sign-offs.
- Router: POS SSID healthy -> *list clients* -> one service iPad on Guest Wi-Fi.
- Config workstation: hot-food category -> routing target = Bar production point (this **unlocks** the printer's real explanation).
- Staff NPCs: "training covered during install", "the partner said everything was ready".

Gating: a step can require a prior discovery (`requires: [...]`) and/or a role. Locked steps show why ("needs a Configuration finding"), which forces the table to talk. Role affinity: Hardware Detective (printers/devices/network), Configuration Inspector (routing/config), Launch Judge (payments, readiness call), Training Profiler (staff, checklist evidence). Non-specialists can still inspect; only the deep action step is role-gated, so nobody is blocked from exploring.

Confidence moves automatically as discoveries land (existing deltas, clamped 0–100); host nudges remain.

## Shared discovery feed + evidence board

New `discoveries` table (`room_id`, `object_id`, `step`, `player_id`, `title`, `detail`, `severity`, `points_to`, `created_at`, unique per room+object+step). Insert-once semantics mean a discovery is a team fact: it broadcasts to every screen via realtime and appears in a compact feed rail ("Ana proved the hot-food ticket prints at the Bar"). The evidence board is a slide-over panel grouping discoveries by area with their severity and which conclusion they support.

## Connect + verdict + reveal

`connect` phase: map dims, board comes forward, team maps discoveries to the eight conclusions and votes the primary cause. Verdict phase keeps Go / Conditional Go / No-Go. Reveal is unchanged plus a coverage summary ("you proved 9 of 13 findings") and the closing line: *A go-live is not ready when everything is configured. It is ready when everything is proven.*

## Technical notes

- New: `src/lib/map.ts` (zones, objects, discovery steps, gating), `src/lib/presence.ts` (broadcast movement hook), `src/components/game/Map/*` (`MapCanvas`, `Avatar`, `MapObject`, `InspectPanel`, `DiscoveryFeed`, `EvidenceBoard`).
- One migration: `discoveries` table with GRANTs, permissive public policies matching the existing tables, added to `supabase_realtime`.
- Rendering uses `transform: translate3d` on ~30 nodes inside one `requestAnimationFrame` loop; no per-frame React state for remote avatars.
- Mobile/narrow screens get a pan-and-tap fallback; layout is tuned for a shared laptop screen first.
- Build order, each step independently playable: (1) migration + map data, (2) static map + local movement, (3) broadcast sync, (4) inspection + discoveries + feed, (5) evidence board, (6) phase retiming and connect/verdict rewiring, (7) Playwright end-to-end run with host + two players.

## Assumptions

- Free exploration is unbounded within the map; there is no per-player action budget beyond the timer and role gates.
- The host does not have an avatar; they observe and control.
