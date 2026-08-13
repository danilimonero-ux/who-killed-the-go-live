# Go-Live Detectives

Build a polished responsive multiplayer web game called “Who Killed the Go-Live?” — a K-Series murder mystery / Cluedo-style game for a live team call, playable in 8–10 minutes. Real-time shared rooms via Supabase realtime/database; no login. Host creates 6-character room code; players join by name and choose from roles Hardware Detective, Configuration Inspector, Launch Judge, Training Profiler. Host/Game Master is separate. Dark cinematic crime-scene UI, evidence cards, suspect board, confidence meter, synchronized countdown, voting and final reveal.

Flow: Lobby max 60s, briefing 30s, initial Go/Conditional/No-Go vote 20s, then 4 investigation rounds about 60s each. Eight suspects: Printer, Network, Payments, PMS, Configuration, Fiscal Receipt, Checklist, Partner Assumption. Group votes for a suspect, host reveals evidence, players classify BLOCKER / WORKAROUND / OUT OF SCOPE / NOISE. Start confidence at 100. Suggested score changes: confirmed OK +5, medium issue -10, blocker -25, missing evidence -30, workaround +10, correct blocker/non-blocker distinction +15. Thresholds 80–100 GO, 60–79 CONDITIONAL GO, 40–59 HIGH RISK, <40 NO-GO.

Case: Casa Fuego Madrid, restaurant + bar + boutique hotel, go-live tomorrow 10:00, private event tomorrow night. Partner says all ready. Client expects printers, integrated payments, PMS room charge, fiscal receipt. Intended solution: Killer Partner Assumption; weapon Checklist Without Evidence; accomplices Payments, Network, Configuration, PMS Scope; false suspect Printer. Evidence: printer test works but real hot-food orders route to Bar; one iPad on Guest Wi-Fi while printer/service devices are on POS network; terminal works standalone but integrated activation pending; PMS room-charge mentioned but no credentials or real test; checklist marked complete but evidence fields empty.

All players see same phase, timer, revealed evidence and aggregated votes. Only host controls reveal, advance, confidence, final reveal, restart. Players vote independently. Late join/reconnect supported. Host panel: room code, player list/roles, phase, timer, suspect cards, reveal, confidence +/- controls, vote results, advance, final reveal, restart. Player screen: role card, one-use power, suspect voting, evidence classification, confidence meter, final verdict vote. Powers: Hardware Detective extra hardware/network clue; Configuration Inspector extra config clue; Launch Judge immediate go/no-go vote once; Training Profiler inspect readiness evidence once.

Landing: Create Investigation / Join Investigation. Minimal how-it-works. Host briefing line: “Welcome detectives. Casa Fuego Madrid was supposed to go live tomorrow. At 18:42, the launch was found dead.” Final reveal: “The killer was Partner Assumption.” “The weapon was a checklist with no evidence.” “No evidence, no go-live.” Include 8–10 MIN badge. Optimize for laptop/Zoom screen share, large type, reliable multiplayer over unnecessary features. No paid APIs. Deployable public URL. Build complete MVP.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://who-killed-the-go-live.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0da5c9b8-d486-4750-9387-cfd74714e27f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
