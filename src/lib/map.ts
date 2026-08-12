/**
 * Casa Fuego — top-down investigation map.
 * World units are a fixed 1600x900 scene, scaled to fit the viewport.
 */

export const WORLD_W = 1600;
export const WORLD_H = 900;

export type Rect = { x: number; y: number; w: number; h: number };

export type ZoneId = "kitchen" | "bar" | "restaurant" | "reception" | "office";

export type Zone = Rect & {
  id: ZoneId;
  name: string;
  /** warm floor tint */
  floor: string;
};

export const ZONES: Zone[] = [
  { id: "kitchen", name: "Kitchen", x: 0, y: 0, w: 520, h: 360, floor: "#2b2521" },
  { id: "bar", name: "Bar", x: 520, y: 0, w: 548, h: 360, floor: "#33251d" },
  { id: "office", name: "Back office", x: 1068, y: 0, w: 532, h: 340, floor: "#26221f" },
  { id: "restaurant", name: "Restaurant floor", x: 0, y: 360, w: 1068, h: 540, floor: "#3a2a20" },
  { id: "reception", name: "Reception · Hotel", x: 1068, y: 340, w: 532, h: 560, floor: "#2e2620" },
];

export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;

/** Solid wall segments (with doorway gaps already carved out). */
export const WALLS: Rect[] = [
  // kitchen / bar -> restaurant, doorways at 200-300 and 700-800
  { x: 0, y: 354, w: 200, h: 12 },
  { x: 300, y: 354, w: 400, h: 12 },
  { x: 800, y: 354, w: 268, h: 12 },
  // kitchen | bar, doorway 150-250
  { x: 514, y: 0, w: 12, h: 150 },
  { x: 514, y: 250, w: 12, h: 110 },
  // west wing | east wing, doorway 500-620
  { x: 1062, y: 0, w: 12, h: 500 },
  { x: 1062, y: 620, w: 12, h: 280 },
  // office | reception, doorway 1380-1480
  { x: 1074, y: 334, w: 306, h: 12 },
  { x: 1480, y: 334, w: 120, h: 12 },
];

export type Severity = "ok" | "warn" | "blocker";

export type Step = {
  /** button label for this action */
  action: string;
  title: string;
  detail: string;
  severity: Severity;
  /** confidence change applied once, room-wide */
  delta: number;
  /** which conclusion this evidence supports */
  pointsTo: string;
  /** role that can perform this action without a prior clue */
  role?: string;
  /** discovery keys ("objectId:step") that also unlock this action */
  requires?: string[];
  /** shown when the step is locked */
  lockedHint?: string;
};

export type MapObject = Rect & {
  id: string;
  name: string;
  zone: ZoneId;
  kind: "device" | "furniture" | "npc" | "paper";
  glyph: string;
  blurb: string;
  steps: Step[];
};

export const OBJECTS: MapObject[] = [
  {
    id: "kitchen_printer",
    name: "Kitchen printer",
    zone: "kitchen",
    kind: "device",
    glyph: "🖨",
    x: 70,
    y: 70,
    w: 72,
    h: 56,
    blurb: "Thermal ticket printer above the hot line.",
    steps: [
      {
        action: "Run a test page",
        title: "Kitchen printer prints a clean test page",
        detail:
          "Paper, power and pairing all confirmed. The device answers immediately. On paper the hardware is innocent.",
        severity: "ok",
        delta: 5,
        pointsTo: "printer",
      },
      {
        action: "Fire a real hot-food order",
        title: "The real hot-food ticket printed at the BAR",
        detail:
          "A genuine order behaves nothing like a test page: the ticket left the kitchen and landed on the bar spool. The printer is fine — the routing is not.",
        severity: "blocker",
        delta: -20,
        pointsTo: "configuration",
        role: "hardware",
        requires: ["pos_station:1", "kds:0"],
        lockedHint:
          "A Hardware Detective can force a real order — or bring a routing/KDS finding from a teammate.",
      },
    ],
  },
  {
    id: "kds",
    name: "Kitchen display (KDS)",
    zone: "kitchen",
    kind: "device",
    glyph: "🖥",
    x: 300,
    y: 60,
    w: 84,
    h: 60,
    blurb: "Screen listing the last 48h of test tickets.",
    steps: [
      {
        action: "Read the 48h ticket log",
        title: "Kitchen received 0 hot-food tickets in 48h. The bar received 31.",
        detail:
          "Every hot-food job during testing was delivered somewhere else. Nobody noticed because nobody compared the two spools.",
        severity: "warn",
        delta: 0,
        pointsTo: "configuration",
      },
    ],
  },
  {
    id: "chef",
    name: "Chef Marta",
    zone: "kitchen",
    kind: "npc",
    glyph: "👩‍🍳",
    x: 180,
    y: 210,
    w: 46,
    h: 46,
    blurb: "Head chef, mid prep, unimpressed.",
    steps: [
      {
        action: "Ask about the tickets",
        title: "\u201cThe tickets come out at the bar. We just walk over.\u201d",
        detail:
          "The kitchen has been living with a workaround for two days and assumed it was normal for a new system.",
        severity: "warn",
        delta: 0,
        pointsTo: "configuration",
      },
    ],
  },
  {
    id: "bar_printer",
    name: "Bar printer",
    zone: "bar",
    kind: "device",
    glyph: "🧾",
    x: 620,
    y: 70,
    w: 72,
    h: 56,
    blurb: "Printer behind the bar, unusually busy.",
    steps: [
      {
        action: "Inspect the spool",
        title: "The bar printer is producing hot-food tickets it should never see",
        detail:
          "Steaks, rice dishes and grill items are queued behind cocktail orders. The destination is wrong at the configuration level.",
        severity: "warn",
        delta: 0,
        pointsTo: "configuration",
      },
    ],
  },
  {
    id: "payment_terminal",
    name: "Payment terminal",
    zone: "bar",
    kind: "device",
    glyph: "💳",
    x: 900,
    y: 200,
    w: 64,
    h: 56,
    blurb: "Card terminal parked next to the bar POS.",
    steps: [
      {
        action: "Run a standalone card sale",
        title: "Standalone card payment approved",
        detail:
          "The terminal takes a card and prints a receipt on its own. Everyone who saw this demo left convinced payments were done.",
        severity: "ok",
        delta: 5,
        pointsTo: "payments",
      },
      {
        action: "Request an integrated sale from the POS",
        title: "Integrated payments are NOT activated",
        detail:
          "The POS request never reaches the terminal: integration is still 'pending with the acquirer'. Standalone is a different product from what the client bought.",
        severity: "blocker",
        delta: -20,
        pointsTo: "payments",
        role: "judge",
        requires: ["pos_station:0"],
        lockedHint: "The Launch Judge owns payments — or open the POS station first.",
      },
    ],
  },
  {
    id: "pos_station",
    name: "POS station",
    zone: "restaurant",
    kind: "device",
    glyph: "🧮",
    x: 120,
    y: 430,
    w: 88,
    h: 64,
    blurb: "Main K-Series till at the service point.",
    steps: [
      {
        action: "Ring up a test order",
        title: "POS takes orders normally",
        detail: "Products, prices and the terrace area all appear. Nothing looks wrong from the till.",
        severity: "ok",
        delta: 5,
        pointsTo: "printer",
      },
      {
        action: "Open category routing",
        title: "Hot food category routes to the BAR production point",
        detail:
          "The site was cloned from a template restaurant. Hot food, course firing and the terrace were never re-mapped to Casa Fuego's kitchen.",
        severity: "blocker",
        delta: -20,
        pointsTo: "configuration",
        role: "config",
        requires: ["kds:0", "bar_printer:0"],
        lockedHint: "The Configuration Inspector can read the routing — or bring a printer/KDS finding.",
      },
    ],
  },
  {
    id: "service_ipad",
    name: "Service iPad",
    zone: "restaurant",
    kind: "device",
    glyph: "📱",
    x: 470,
    y: 640,
    w: 52,
    h: 64,
    blurb: "Handheld left on table 4.",
    steps: [
      {
        action: "Check the network settings",
        title: "This iPad is on \u201cCasa Fuego Guest\u201d Wi-Fi",
        detail:
          "Every printer and every other service device sits on the POS network. This one handheld is on the guest SSID.",
        severity: "warn",
        delta: 0,
        pointsTo: "network",
      },
      {
        action: "Move it to the POS SSID and re-test",
        title: "Fixable before service — but it must be documented",
        detail:
          "Moving the device to the POS network restores ordering. A real workaround, not a launch stopper — as long as somebody owns it in writing.",
        severity: "ok",
        delta: 10,
        pointsTo: "network",
        role: "hardware",
        requires: ["router:1"],
        lockedHint: "Needs the Hardware Detective, or the client list from the network rack.",
      },
    ],
  },
  {
    id: "waiter",
    name: "Waiter Diego",
    zone: "restaurant",
    kind: "npc",
    glyph: "🧑‍🍳",
    x: 700,
    y: 560,
    w: 46,
    h: 46,
    blurb: "Front of house, first shift on the new system.",
    steps: [
      {
        action: "Ask about training",
        title: "\u201cTraining? It was covered during the install.\u201d",
        detail:
          "No session, no materials, no named attendees. The checklist records staff training as complete anyway.",
        severity: "warn",
        delta: 0,
        pointsTo: "checklist",
      },
    ],
  },
  {
    id: "router",
    name: "Network rack",
    zone: "office",
    kind: "device",
    glyph: "📶",
    x: 1130,
    y: 70,
    w: 76,
    h: 60,
    blurb: "Router, switch and two access points.",
    steps: [
      {
        action: "Inspect the rack",
        title: "POS network looks healthy",
        detail: "Switch, uplink and both SSIDs are up. Printers all answer on the POS network.",
        severity: "ok",
        delta: 5,
        pointsTo: "network",
      },
      {
        action: "List connected clients",
        title: "One service device is sitting on the guest SSID",
        detail:
          "The guest network is isolated from the POS VLAN. Whatever is on it cannot talk to the printers.",
        severity: "warn",
        delta: 0,
        pointsTo: "network",
        role: "hardware",
        requires: ["service_ipad:0"],
        lockedHint: "Hardware Detective access — or find the offending device on the floor first.",
      },
    ],
  },
  {
    id: "checklist_binder",
    name: "Go-live checklist",
    zone: "office",
    kind: "paper",
    glyph: "📋",
    x: 1300,
    y: 190,
    w: 60,
    h: 70,
    blurb: "A binder on the office desk. Everything ticked.",
    steps: [
      {
        action: "Read the checklist",
        title: "12 of 12 lines marked complete",
        detail: "Printers, payments, PMS, fiscal, training — all green, all signed off as done.",
        severity: "ok",
        delta: 5,
        pointsTo: "checklist",
      },
      {
        action: "Open the evidence fields",
        title: "0 screenshots. 0 test IDs. 0 named sign-offs.",
        detail:
          "The weapon. A checklist without evidence does not prove readiness; it only proves that somebody clicked.",
        severity: "blocker",
        delta: -25,
        pointsTo: "checklist",
        role: "training",
        requires: ["waiter:0"],
        lockedHint: "The Training Profiler can audit evidence — or bring a staff readiness finding.",
      },
    ],
  },
  {
    id: "partner_email",
    name: "Partner status report",
    zone: "office",
    kind: "paper",
    glyph: "✉️",
    x: 1440,
    y: 190,
    w: 56,
    h: 66,
    blurb: "Printed email from the implementation partner.",
    steps: [
      {
        action: "Read the report",
        title: "\u201cSite is 100% ready for go-live.\u201d",
        detail: "Sent yesterday at 17:10. It lists what was configured. It lists nothing that was proven.",
        severity: "warn",
        delta: 0,
        pointsTo: "partner",
      },
      {
        action: "Ask for the evidence behind it",
        title: "Readiness was reported, never demonstrated",
        detail:
          "Every other finding exists downstream of this one: the partner assumed configuration equals readiness and told the client so.",
        severity: "blocker",
        delta: -15,
        pointsTo: "partner",
        requires: ["checklist_binder:1"],
        lockedHint: "Somebody has to prove the checklist is empty before this question has teeth.",
      },
    ],
  },
  {
    id: "config_ws",
    name: "Configuration workstation",
    zone: "office",
    kind: "device",
    glyph: "💻",
    x: 1160,
    y: 200,
    w: 80,
    h: 62,
    blurb: "Back-office laptop with the K-Series site config open.",
    steps: [
      {
        action: "Open the site setup",
        title: "The site was cloned from a template restaurant",
        detail:
          "Areas, course firing and production points were inherited, not designed. Nothing here was validated against a real Casa Fuego order.",
        severity: "warn",
        delta: 0,
        pointsTo: "configuration",
      },
    ],
  },
  {
    id: "pms_terminal",
    name: "PMS terminal",
    zone: "reception",
    kind: "device",
    glyph: "🏨",
    x: 1180,
    y: 470,
    w: 84,
    h: 62,
    blurb: "Hotel front-desk system behind reception.",
    steps: [
      {
        action: "Open the room charge menu",
        title: "Room charge exists in the menu",
        detail: "The option is there, exactly as it was 'mentioned in the kickoff'. It looks implemented.",
        severity: "ok",
        delta: 5,
        pointsTo: "pms",
      },
      {
        action: "Post a test charge to room 214",
        title: "No interface user. No credentials. No posting ever succeeded.",
        detail:
          "There is no evidence this ever worked. A boutique hotel with a private event cannot discover that at 21:00.",
        severity: "blocker",
        delta: -20,
        pointsTo: "pms",
        role: "judge",
        requires: ["receptionist:0"],
        lockedHint: "The Launch Judge can attempt the posting — or ask reception first.",
      },
    ],
  },
  {
    id: "receptionist",
    name: "Receptionist Nuria",
    zone: "reception",
    kind: "npc",
    glyph: "🛎",
    x: 1380,
    y: 560,
    w: 46,
    h: 46,
    blurb: "Front desk, tomorrow's event list in hand.",
    steps: [
      {
        action: "Ask about room charges",
        title: "\u201cNobody has ever charged a room to test it.\u201d",
        detail:
          "Reception was shown the menu option and told it works. Tomorrow's private event is full of guests who will try to use it.",
        severity: "warn",
        delta: 0,
        pointsTo: "pms",
      },
    ],
  },
  {
    id: "fiscal_printer",
    name: "Fiscal printer",
    zone: "reception",
    kind: "device",
    glyph: "🧷",
    x: 1420,
    y: 430,
    w: 68,
    h: 58,
    blurb: "Legal receipt printer shared by both entities.",
    steps: [
      {
        action: "Check the fiscal layout",
        title: "Fiscal layout is installed",
        detail: "The template is loaded for both the bar and the hotel entity. It has never printed live.",
        severity: "ok",
        delta: 5,
        pointsTo: "fiscal",
      },
      {
        action: "Print end-to-end with real tax rates",
        title: "Legal output was never validated on a two-entity site",
        detail:
          "Probably fine. 'Probably' is not a state you want your tax receipts in on the morning of a launch.",
        severity: "blocker",
        delta: -8,
        pointsTo: "fiscal",
        role: "config",
        requires: ["pms_terminal:0"],
        lockedHint: "Configuration Inspector access — or open the hotel side of the site first.",
      },
    ],
  },
];

export const objectById = (id: string) => OBJECTS.find((o) => o.id === id) ?? null;

export const discoveryKey = (objectId: string, step: number) => `${objectId}:${step}`;

export const TOTAL_STEPS = OBJECTS.reduce((n, o) => n + o.steps.length, 0);

/** Purely decorative props (tables, plants, fittings) — never interactive. */
export type Prop = Rect & { id: string; kind: "table" | "bar" | "counter" | "plant" | "line" };

export const PROPS: Prop[] = [
  { id: "line", kind: "line", x: 40, y: 150, w: 420, h: 46 },
  { id: "pass", kind: "counter", x: 40, y: 260, w: 300, h: 40 },
  { id: "barcounter", kind: "bar", x: 560, y: 220, w: 420, h: 54 },
  { id: "backbar", kind: "counter", x: 560, y: 40, w: 40, h: 160 },
  { id: "desk", kind: "counter", x: 1130, y: 170, w: 340, h: 110 },
  { id: "frontdesk", kind: "counter", x: 1120, y: 420, w: 200, h: 130 },
  { id: "plant1", kind: "plant", x: 1520, y: 700, w: 44, h: 44 },
  { id: "plant2", kind: "plant", x: 40, y: 820, w: 44, h: 44 },
  { id: "t1", kind: "table", x: 180, y: 560, w: 80, h: 80 },
  { id: "t2", kind: "table", x: 340, y: 700, w: 80, h: 80 },
  { id: "t3", kind: "table", x: 480, y: 480, w: 80, h: 80 },
  { id: "t4", kind: "table", x: 460, y: 640, w: 80, h: 80 },
  { id: "t5", kind: "table", x: 660, y: 720, w: 80, h: 80 },
  { id: "t6", kind: "table", x: 840, y: 520, w: 80, h: 80 },
  { id: "t7", kind: "table", x: 880, y: 700, w: 80, h: 80 },
  { id: "t8", kind: "table", x: 240, y: 420, w: 80, h: 80 },
];

/** Everything a player can bump into. */
export const COLLIDERS: Rect[] = [
  ...WALLS,
  ...PROPS.filter((p) => p.kind !== "plant").map(({ x, y, w, h }) => ({ x, y, w, h })),
  ...OBJECTS.filter((o) => o.kind !== "npc").map(({ x, y, w, h }) => ({ x, y, w, h })),
];

export const SPAWN = { x: 300, y: 830 };

export const AVATAR_COLORS = [
  "#e8833a",
  "#4fb0a5",
  "#c96fb0",
  "#7d9ce0",
  "#d8c05a",
  "#8fbf62",
  "#e06a5a",
  "#a98cdc",
];

export function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export const PLAYER_R = 16;

export function collides(x: number, y: number) {
  if (x - PLAYER_R < 4 || y - PLAYER_R < 4 || x + PLAYER_R > WORLD_W - 4 || y + PLAYER_R > WORLD_H - 4)
    return true;
  for (const c of COLLIDERS) {
    if (
      x + PLAYER_R > c.x &&
      x - PLAYER_R < c.x + c.w &&
      y + PLAYER_R > c.y &&
      y - PLAYER_R < c.y + c.h
    )
      return true;
  }
  return false;
}

export const INTERACT_RANGE = 130;

export function objectCenter(o: Rect) {
  return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
}

export function isStepUnlocked(step: Step, role: string | null, found: Set<string>) {
  if (!step.role && !step.requires) return true;
  if (step.role && role === step.role) return true;
  if (step.requires && step.requires.every((k) => found.has(k))) return true;
  return false;
}

/** Doorway waypoints between zones — used for lightweight click-to-walk routing. */
type Door = { a: ZoneId; b: ZoneId; x: number; y: number };
const DOORS: Door[] = [
  { a: "kitchen", b: "restaurant", x: 250, y: 360 },
  { a: "bar", b: "restaurant", x: 750, y: 360 },
  { a: "kitchen", b: "bar", x: 520, y: 200 },
  { a: "restaurant", b: "reception", x: 1068, y: 560 },
  { a: "office", b: "reception", x: 1430, y: 340 },
];

export function zoneAt(x: number, y: number): ZoneId {
  for (const z of ZONES) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.id;
  }
  return "restaurant";
}

/** Returns the doorway waypoints to walk through to get from one point to another. */
export function routeWaypoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] {
  const start = zoneAt(from.x, from.y);
  const goal = zoneAt(to.x, to.y);
  if (start === goal) return [];
  const prev = new Map<ZoneId, { zone: ZoneId; door: Door } | null>([[start, null]]);
  const queue: ZoneId[] = [start];
  while (queue.length) {
    const z = queue.shift()!;
    if (z === goal) break;
    for (const d of DOORS) {
      const other = d.a === z ? d.b : d.b === z ? d.a : null;
      if (!other || prev.has(other)) continue;
      prev.set(other, { zone: z, door: d });
      queue.push(other);
    }
  }
  if (!prev.has(goal)) return [];
  const path: { x: number; y: number }[] = [];
  let cur: ZoneId = goal;
  while (cur !== start) {
    const step = prev.get(cur);
    if (!step) break;
    path.unshift({ x: step.door.x, y: step.door.y });
    cur = step.zone;
  }
  return path;
}
