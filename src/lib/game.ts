export type Phase =
  | "lobby"
  | "briefing"
  | "initial"
  | "investigate"
  | "connect"
  | "verdict"
  | "reveal";

export type Classification = "BLOCKER" | "WORKAROUND" | "OUT OF SCOPE" | "NOISE";

export const CLASSIFICATIONS: Classification[] = [
  "BLOCKER",
  "WORKAROUND",
  "OUT OF SCOPE",
  "NOISE",
];

export type Suspect = {
  id: string;
  name: string;
  tagline: string;
  evidence: string;
  finding: string;
  correct: Classification;
  delta: number;
  deltaLabel: string;
};

export const SUSPECTS: Suspect[] = [
  {
    id: "printer",
    name: "Printer",
    tagline: "The loud one in the kitchen",
    evidence:
      "Kitchen printer test page prints perfectly. Paper, power and pairing all confirmed by the partner on site.",
    finding:
      "The hardware is innocent. Real hot-food orders still land at the Bar printer — that is a routing decision, not a device fault.",
    correct: "NOISE",
    delta: 5,
    deltaLabel: "Hardware confirmed OK",
  },
  {
    id: "network",
    name: "Network",
    tagline: "Two SSIDs, one bad habit",
    evidence:
      "One service iPad is connected to Casa Fuego Guest Wi-Fi. Printers and every other service device sit on the POS network.",
    finding:
      "Fixable before service: move the iPad to the POS SSID and re-test. Not a launch stopper, but it must be documented.",
    correct: "WORKAROUND",
    delta: 10,
    deltaLabel: "Workaround available",
  },
  {
    id: "payments",
    name: "Payments",
    tagline: "Works alone. Never together.",
    evidence:
      "The terminal completes standalone card sales. Integrated activation with the POS is still 'pending with the acquirer'.",
    finding:
      "Client expectation is integrated payments. Standalone is a different product. No activation, no integrated flow on day one.",
    correct: "BLOCKER",
    delta: -25,
    deltaLabel: "Blocker: integration not activated",
  },
  {
    id: "pms",
    name: "PMS",
    tagline: "Charge to room 214, allegedly",
    evidence:
      "Room charge was 'mentioned in the kickoff'. No PMS credentials, no interface user, no successful posting test.",
    finding:
      "There is no evidence this ever worked. A boutique hotel with a private event cannot discover this at 21:00.",
    correct: "BLOCKER",
    delta: -30,
    deltaLabel: "Missing evidence entirely",
  },
  {
    id: "configuration",
    name: "Configuration",
    tagline: "Everything is set. Nothing is right.",
    evidence:
      "Hot-food category routes to the Bar production point. Course firing and the terrace area were copied from a template site.",
    finding:
      "This is the mechanism behind the printer 'fault'. Configuration was assumed, never validated against a real order.",
    correct: "BLOCKER",
    delta: -25,
    deltaLabel: "Blocker: routing wrong for real orders",
  },
  {
    id: "fiscal",
    name: "Fiscal Receipt",
    tagline: "The one the lawyers care about",
    evidence:
      "Fiscal layout is installed but never printed end-to-end with real tax rates for the bar and the hotel entity.",
    finding:
      "Medium severity: likely fine, but unvalidated legal output on a two-entity site is not something you discover live.",
    correct: "BLOCKER",
    delta: -10,
    deltaLabel: "Medium issue: unvalidated legal output",
  },
  {
    id: "checklist",
    name: "Checklist Without Evidence",
    tagline: "All green. All empty.",
    evidence:
      "Every line of the go-live checklist is ticked complete. Every evidence field — screenshots, test IDs, sign-off — is blank.",
    finding:
      "The weapon. A checklist without evidence does not prove readiness; it only proves someone clicked.",
    correct: "BLOCKER",
    delta: -30,
    deltaLabel: "Missing evidence: unverifiable sign-off",
  },
  {
    id: "partner",
    name: "Partner Assumption",
    tagline: "\u201cEverything is ready\u201d",
    evidence:
      "Partner reported the site 100% ready without a single validated test, relying on what was configured, not what was proven.",
    finding:
      "The killer. Every other finding exists because readiness was assumed and reported instead of demonstrated.",
    correct: "BLOCKER",
    delta: -25,
    deltaLabel: "Blocker: readiness assumed, never proven",
  },
];

export const suspectById = (id: string | null | undefined) =>
  SUSPECTS.find((s) => s.id === id) ?? null;

export type Role = {
  id: string;
  name: string;
  brief: string;
  power: string;
  clue: string;
};

export const ROLES: Role[] = [
  {
    id: "hardware",
    name: "Hardware Detective",
    brief: "Printers, terminals, cables, cash drawers. You trust nothing that has not printed.",
    power: "Extra hardware / network clue",
    clue:
      "HARDWARE FILE: Every printer answers a test page. But the kitchen printer has received zero hot-food jobs in the last 48h of testing \u2014 the Bar printer received 31. The devices are fine. The routing is not.",
  },
  {
    id: "config",
    name: "Configuration Inspector",
    brief: "Categories, price levels, production points. You read the setup, not the summary.",
    power: "Extra configuration clue",
    clue:
      "CONFIG FILE: The site was cloned from a template restaurant. Terrace area, course firing and hot-food production point were never re-mapped for Casa Fuego's kitchen layout.",
  },
  {
    id: "judge",
    name: "Launch Judge",
    brief: "You own the call. Go, Conditional Go, or No-Go \u2014 and the reason behind it.",
    power: "Call an immediate go / no-go vote (once)",
    clue:
      "JUDGE FILE: The private event tomorrow night means the first real load is not lunch service \u2014 it is a full room with room-charge and integrated payment expectations. Risk is front-loaded, not gradual.",
  },
  {
    id: "training",
    name: "Training Profiler",
    brief: "People, readiness, evidence. A signed checklist means nothing without proof.",
    power: "Inspect readiness evidence (once)",
    clue:
      "READINESS FILE: 12 checklist lines marked complete. 0 screenshots attached. 0 test transaction IDs. 0 named sign-offs. Staff training was recorded as 'covered during install'.",
  },
];

export const roleById = (id: string | null | undefined) =>
  ROLES.find((r) => r.id === id) ?? null;

export const INITIAL_OPTIONS = ["GO", "CONDITIONAL GO", "NO-GO"] as const;

export const PHASE_SECONDS: Record<string, number> = {
  lobby: 60,
  briefing: 45,
  initial: 20,
  investigate: 270,
  connect: 120,
  verdict: 60,
  reveal: 0,
  // legacy phase kept so old rooms in progress still render a timer
  round: 60,
};

export const PHASE_LABEL: Record<string, string> = {
  lobby: "Assembling the team",
  briefing: "Crime scene briefing",
  initial: "First instinct vote",
  investigate: "On the scene — free investigation",
  connect: "Connecting the evidence",
  round: "Investigation",
  verdict: "Final verdict",
  reveal: "The reveal",
};

export function verdictBand(confidence: number) {
  if (confidence >= 80)
    return { label: "GO", tone: "go" as const, note: "Launch is defensible." };
  if (confidence >= 60)
    return {
      label: "CONDITIONAL GO",
      tone: "warn" as const,
      note: "Launch only with named owners and deadlines.",
    };
  if (confidence >= 40)
    return { label: "HIGH RISK", tone: "risk" as const, note: "Launching would be a gamble." };
  return { label: "NO-GO", tone: "nogo" as const, note: "This go-live cannot happen." };
}

export const CLOSING_LINE =
  "A go-live is not ready when everything is configured. It is ready when everything is proven.";

export const BRIEFING_LINE =
  "Welcome detectives. Casa Fuego Madrid was supposed to go live tomorrow. At 18:42, the launch was found dead.";

export const CASE_FACTS = [
  "Casa Fuego Madrid \u2014 restaurant, bar and a 24-room boutique hotel, one site, two legal entities.",
  "Go-live scheduled tomorrow at 10:00. A private event fills the venue tomorrow night.",
  "The partner reports that everything is ready.",
  "The client expects working printers, integrated payments, PMS room charge and a valid fiscal receipt.",
];

export function newRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
