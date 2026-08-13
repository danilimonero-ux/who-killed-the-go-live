/**
 * Casa Fuego — competitive single-player-per-detective case file.
 * Every player gets the same private instance of this data.
 */

export const WORLD_W = 1600;
export const WORLD_H = 900;
export const GAME_SECONDS = 600;

export type Rect = { x: number; y: number; w: number; h: number };

export type Zone = Rect & {
  id: string;
  name: string;
  icon: string;
  floor: string;
  /** cosmetic subtitle shown on the map label */
  sub: string;
};

export const ZONES: Zone[] = [
  { id: "network", name: "Terrace · Network", icon: "🌐", sub: "Network & devices", x: 0, y: 0, w: 320, h: 470, floor: "#232a2e" },
  { id: "office", name: "Office", icon: "🖥️", sub: "Back office & config", x: 320, y: 0, w: 440, h: 470, floor: "#272320" },
  { id: "hot", name: "Hot Kitchen", icon: "🔥", sub: "Printers & KDS", x: 760, y: 0, w: 320, h: 300, floor: "#33241d" },
  { id: "cold", name: "Cold Kitchen", icon: "❄️", sub: "Printers & KDS", x: 1080, y: 0, w: 280, h: 300, floor: "#20262b" },
  { id: "desserts", name: "Desserts", icon: "🍰", sub: "Printers & KDS", x: 1360, y: 0, w: 240, h: 300, floor: "#2b2130" },
  { id: "pass", name: "Kitchen Pass", icon: "👨‍🍳", sub: "Tickets & staff", x: 760, y: 300, w: 840, h: 170, floor: "#2c2621" },
  { id: "hostess", name: "Reception", icon: "🛎️", sub: "PMS & payments", x: 0, y: 470, w: 320, h: 430, floor: "#2c2419" },
  { id: "restaurant", name: "Dining Room", icon: "🍽️", sub: "Order profiles & menus", x: 320, y: 470, w: 860, h: 430, floor: "#3a2a20" },
  { id: "bar", name: "Bar", icon: "🍸", sub: "Receipts & payments", x: 1180, y: 470, w: 260, h: 430, floor: "#33251d" },
  { id: "pos1", name: "Storage · POS 1", icon: "🧾", sub: "Receipts & stock", x: 1440, y: 470, w: 160, h: 430, floor: "#262c26" },
];


export type EvidenceKind = "key" | "alibi" | "herring" | "context";

export type Evidence = {
  id: string;
  code: string;
  title: string;
  line: string;
  icon: string;
  kind: EvidenceKind;
};

export type Verb = "inspect" | "ping" | "trace" | "test" | "ask";

export const VERB_META: Record<Verb, { icon: string; label: string }> = {
  inspect: { icon: "🔎", label: "Inspect" },
  ping: { icon: "📡", label: "Ping" },
  trace: { icon: "🔗", label: "Trace" },
  test: { icon: "🧪", label: "Test" },
  ask: { icon: "👤", label: "Ask" },
};

export type Action = {
  id: string;
  verb: Verb;
  label: string;
  /** short result lines shown in the inspection card */
  lines: string[];
  evidence?: Evidence;
  /** evidence ids required before this action unlocks */
  requires?: string[];
  lockedHint?: string;
};

export type CaseObject = {
  id: string;
  name: string;
  icon: string;
  zone: string;
  x: number;
  y: number;
  blurb: string;
  actions: Action[];
};

const ev = (
  id: string,
  code: string,
  icon: string,
  title: string,
  line: string,
  kind: EvidenceKind,
): Evidence => ({ id, code, icon, title, line, kind });

export const OBJECTS: CaseObject[] = [
  /* ── NETWORK ROOM ───────────────────────────────────────────── */
  {
    id: "router",
    name: "Router",
    icon: "📶",
    zone: "network",
    x: 60,
    y: 70,
    blurb: "Main gateway, 192.168.1.1",
    actions: [
      {
        id: "router_inspect",
        verb: "inspect",
        label: "Inspect router",
        lines: ["Uptime 41 days.", "VLAN POS · VLAN GUEST separated.", "No blocked ports on 9100."],
      },
      {
        id: "router_ping",
        verb: "ping",
        label: "Ping the POS segment",
        lines: ["192.168.1.0/24 → 6/6 hosts answering.", "Average 2 ms · 0% loss."],
      },
    ],
  },
  {
    id: "switch",
    name: "Switch",
    icon: "🔌",
    zone: "network",
    x: 190,
    y: 70,
    blurb: "8-port PoE switch",
    actions: [
      {
        id: "switch_inspect",
        verb: "inspect",
        label: "Inspect ports",
        lines: ["Port 1 POS 1 · Port 2 Pass · Port 3 Hot · Port 4 Cold · Port 5 Desserts · Port 6 Hostess.", "All links up at 100 Mbps."],
      },
    ],
  },
  {
    id: "ip_sheet",
    name: "IP sheet",
    icon: "📄",
    zone: "network",
    x: 60,
    y: 250,
    blurb: "Taped to the rack door",
    actions: [
      {
        id: "ip_inspect",
        verb: "inspect",
        label: "Read the IP list",
        lines: [
          "🟢 .211 PRT-HOSTESS DESK RECEIPT · TM-T20",
          "🟢 .201 PRT-POS 1-PRINTER RECEIPT · TM-T20",
          "🟢 .202 PRT-KITCHEN PASS · TM-U220",
          "🟢 .203 PRT-HOT KITCHEN · TM-U220",
          "🟢 .204 PRT-COLD KITCHEN · TM-U220",
          "🟢 .205 PRT-DESSERTS · TM-U220",
        ],
        evidence: ev(
          "E00",
          "E00",
          "🟢",
          "ALL SIX PRINTERS ADDRESSED",
          "Every configured printer has a reachable IP on the POS network.",
          "alibi",
        ),
      },
    ],
  },
  {
    id: "net_log",
    name: "Network log",
    icon: "📈",
    zone: "network",
    x: 190,
    y: 250,
    blurb: "Rolling connectivity log",
    actions: [
      {
        id: "log_trace",
        verb: "trace",
        label: "Trace tonight's log",
        lines: [
          "18:41:07 192.168.1.203 timeout",
          "18:41:33 192.168.1.203 timeout",
          "18:42:04 192.168.1.203 connection restored",
          "19:07 → all hosts responding.",
        ],
        evidence: ev(
          "E03",
          "E03",
          "⏱",
          "THE 60-SECOND OUTAGE",
          "Hot Kitchen printer dropped twice at 18:41 and recovered at 18:42 — before the incident.",
          "herring",
        ),
      },
    ],
  },

  /* ── BACK OFFICE ────────────────────────────────────────────── */
  {
    id: "bo_accounting",
    name: "Accounting Groups",
    icon: "🗂️",
    zone: "office",
    x: 360,
    y: 60,
    blurb: "Back Office · Accounting Groups",
    actions: [
      {
        id: "ag_inspect",
        verb: "inspect",
        label: "Open Accounting Groups",
        lines: [
          "FOOD HOT → Production Center: HOT KITCHEN",
          "FOOD COLD → Production Center: COLD KITCHEN",
          "DESSERTS → Production Center: DESSERTS",
          "DRINKS → Production Center: PASS",
          "VARIOS → (not reviewed)",
        ],
      },
      {
        id: "ag_varios",
        verb: "trace",
        label: "Trace VARIOS",
        lines: [
          "ACCOUNTING GROUP · VARIOS",
          "Tax: Reduced IVA 10%",
          "PRIMARY PRODUCTION CENTER: ❌ NONE",
          "Items inheriting this group get no production route.",
        ],
        requires: ["E06a"],
        lockedHint: "Nothing points at VARIOS yet. Find an item that lives in it.",
        evidence: ev(
          "E06",
          "E06",
          "⛓️‍💥",
          "THE BROKEN LINK",
          "RIBEYE → VARIOS → ❌ NO PRODUCTION CENTER. The route dies before it reaches any printer.",
          "key",
        ),
      },
      {
        id: "ag_tax",
        verb: "inspect",
        label: "Check tax assignments",
        lines: [
          "DRINKS assigned General IVA 21% ✅",
          "FOOD COLD assigned Reduced IVA 10% ✅",
          "COFFEE assigned General IVA 21% ⚠️ should be 10%",
          "A real fiscal defect — but tax never stops a ticket from printing.",
        ],
        evidence: ev(
          "E11",
          "E11",
          "🧾",
          "THE WRONG TAX RATE",
          "COFFEE is on 21% instead of 10%. Genuine issue, cannot explain missing hot-food tickets.",
          "herring",
        ),
      },
    ],
  },
  {
    id: "bo_production",
    name: "Production Centers",
    icon: "🏭",
    zone: "office",
    x: 510,
    y: 60,
    blurb: "Back Office · Production Centers",
    actions: [
      {
        id: "pc_inspect",
        verb: "inspect",
        label: "Open Production Centers",
        lines: [
          "HOT KITCHEN → PP-KITCHEN HOT",
          "PASS → PP-PASS · COLD KITCHEN → PP-COLD",
          "DESSERTS → PP-DESSERTS · POS 1 PRINTER RECEIPT → PP-RECEIPT",
          "Order / course / transfer tickets: ENABLED",
        ],
        evidence: ev(
          "E04",
          "E04",
          "🛣️",
          "THE ROUTE EXISTS",
          "HOT KITCHEN production center is present, enabled and bound to PP-KITCHEN HOT.",
          "context",
        ),
      },
    ],
  },
  {
    id: "bo_printing",
    name: "Printing Profiles",
    icon: "🖨️",
    zone: "office",
    x: 650,
    y: 60,
    blurb: "Back Office · Printing Profiles",
    actions: [
      {
        id: "pp_inspect",
        verb: "inspect",
        label: "Open PP-KITCHEN HOT",
        lines: [
          "Primary printer: PRT-HOT KITCHEN",
          "Copies: 1 · Fallback: none",
          "Chain: HOT KITCHEN → PP-KITCHEN HOT → PRT-HOT KITCHEN → 192.168.1.203",
        ],
        evidence: ev(
          "E05",
          "E05",
          "🔗",
          "THE LAST MILE",
          "The printing profile resolves cleanly all the way to the physical Hot Kitchen printer.",
          "context",
        ),
      },
    ],
  },
  {
    id: "bo_orderprofiles",
    name: "Order Profiles",
    icon: "📐",
    zone: "office",
    x: 360,
    y: 200,
    blurb: "Back Office · Order Profiles",
    actions: [
      {
        id: "op_inspect",
        verb: "inspect",
        label: "Open Dine In",
        lines: [
          "DINE IN · valid production centers:",
          "HOT KITCHEN ✅ · COLD KITCHEN ✅ · PASS ✅ · DESSERTS ✅",
          "No exclusions, no time restrictions.",
        ],
        evidence: ev(
          "E07",
          "E07",
          "✅",
          "DINE IN IS CLEAN",
          "The order profile allows Hot Kitchen. Nothing here blocks the ticket.",
          "alibi",
        ),
      },
    ],
  },
  {
    id: "bo_menu",
    name: "Menu",
    icon: "📖",
    zone: "office",
    x: 510,
    y: 200,
    blurb: "Back Office · Items",
    actions: [
      {
        id: "menu_ribeye",
        verb: "inspect",
        label: "Open RIBEYE 300g",
        lines: [
          "RIBEYE 300g · €32.00",
          "Accounting Group: VARIOS",
          "Production routing: inherited from Accounting Group",
        ],
        evidence: ev(
          "E06a",
          "E06a",
          "🥩",
          "RIBEYE LIVES IN VARIOS",
          "Ribeye 300g sits in Accounting Group VARIOS, not FOOD HOT.",
          "key",
        ),
      },
      {
        id: "menu_compare",
        verb: "trace",
        label: "Compare with Burrata",
        lines: [
          "BURRATA · Accounting Group FOOD COLD → COLD KITCHEN ✅",
          "CHEESECAKE · DESSERTS → DESSERTS ✅",
          "MAHOU · DRINKS → PASS ✅",
          "RIBEYE 300g · VARIOS → ?",
        ],
      },
    ],
  },
  {
    id: "bo_import",
    name: "Import history",
    icon: "📥",
    zone: "office",
    x: 650,
    y: 200,
    blurb: "Back Office · Data import log",
    actions: [
      {
        id: "import_inspect",
        verb: "inspect",
        label: "Open 17:34 Menu Import",
        lines: [
          "MENU IMPORT · 17:34 · by Partner Admin",
          "276 items · 273 successful · 3 warnings",
          "⚠️ 3 items could not be matched to an existing accounting group.",
          "Fallback accounting group applied: VARIOS",
          "→ RIBEYE 300g · IBERIAN PORK · GRILLED OCTOPUS",
        ],
        evidence: ev(
          "E08",
          "E08",
          "📥",
          "THE UNREAD WARNING",
          "The import silently fell back to VARIOS for exactly three items — and nobody read the warning.",
          "key",
        ),
      },
    ],
  },
  {
    id: "bo_tests",
    name: "Test history",
    icon: "🧪",
    zone: "office",
    x: 430,
    y: 340,
    blurb: "Back Office · Validation log",
    actions: [
      {
        id: "tests_inspect",
        verb: "inspect",
        label: "Open test history",
        lines: [
          "18:02 Printer test HOT / COLD / DESSERTS / POS → PASS",
          "18:08 Payment terminal test → PASS",
          "18:13 PMS room charge test → PASS",
          "❌ NO END-TO-END ORDER TEST FOUND",
        ],
        evidence: ev(
          "E09",
          "E09",
          "🧭",
          "NOTHING WAS PROVEN END TO END",
          "Every test was a device test. Item → Accounting Group → Production Center → Profile → Printer was never run.",
          "key",
        ),
      },
    ],
  },
  {
    id: "bo_checklist",
    name: "Go-Live checklist",
    icon: "📋",
    zone: "office",
    x: 600,
    y: 340,
    blurb: "Signed off by the partner",
    actions: [
      {
        id: "check_inspect",
        verb: "inspect",
        label: "Open the checklist",
        lines: [
          "☑ Printers configured · evidence: 6 screenshots",
          "☑ Printer test executed · evidence: 4 test prints",
          "☑ Production centers · evidence: 1 screenshot",
          "☑ Printing profiles · evidence: 1 screenshot",
          "☑ Menu imported · evidence: —",
          "☑ Order profiles · evidence: —",
          "☑ End-to-end routing validated · evidence: —",
        ],
      },
      {
        id: "check_trace",
        verb: "trace",
        label: "Open 'end-to-end routing validated'",
        lines: [
          "LINE 7 · END-TO-END ROUTING VALIDATED",
          "Marked complete 18:20 by Partner Admin",
          "ATTACHED EVIDENCE: NONE",
        ],
        evidence: ev(
          "E10",
          "E10",
          "📋",
          "A TICK WITH NOTHING BEHIND IT",
          "The most important line on the checklist is green and carries zero evidence.",
          "key",
        ),
      },
    ],
  },

  /* ── HOT KITCHEN ────────────────────────────────────────────── */
  {
    id: "prt_hot",
    name: "PRT-HOT KITCHEN",
    icon: "🖨️",
    zone: "hot",
    x: 800,
    y: 60,
    blurb: "Epson TM-U220 over the hot line",
    actions: [
      {
        id: "hot_inspect",
        verb: "inspect",
        label: "Inspect the printer",
        lines: ["Epson TM-U220 · 192.168.1.203", "Status: ONLINE · paper OK · cover closed", "Queue: empty"],
      },
      {
        id: "hot_ping",
        verb: "ping",
        label: "Ping 192.168.1.203",
        lines: ["4 packets sent · 4 received · 0% loss", "Average 2 ms"],
      },
      {
        id: "hot_test",
        verb: "test",
        label: "Send a test print",
        lines: ["*** TEST PRINT ***", "PRT-HOT KITCHEN · OK", "Paper came out. Hardware answers."],
        evidence: ev(
          "E01",
          "E01",
          "🛡️",
          "THE ALIBI",
          "PRT-HOT KITCHEN is online, reachable and prints. Hardware and network are cleared — routing is not.",
          "alibi",
        ),
      },
    ],
  },
  {
    id: "crumpled",
    name: "Crumpled ticket",
    icon: "🗒️",
    zone: "hot",
    x: 960,
    y: 60,
    blurb: "On the floor behind the pass",
    actions: [
      {
        id: "crumpled_inspect",
        verb: "inspect",
        label: "Flatten the paper",
        lines: [
          "— PRINTER TEST TICKET —",
          "YESTERDAY 18:02",
          "1x RIBEYE MEDIUM / 1x FRIES",
          "*** HOT KITCHEN ***",
          "Header says TEST. No table, no order number, no course.",
        ],
        evidence: ev(
          "E02",
          "E02",
          "👻",
          "YESTERDAY'S GHOST",
          "A test ticket typed straight at the printer — it never travelled through the item routing.",
          "context",
        ),
      },
    ],
  },
  {
    id: "chef",
    name: "Head chef",
    icon: "👨‍🍳",
    zone: "hot",
    x: 880,
    y: 180,
    blurb: "Twelve covers already waiting",
    actions: [
      {
        id: "chef_ask",
        verb: "ask",
        label: "Ask about the tests",
        lines: ["“The technician tested every printer. I saw paper coming out of all of them.”"],
      },
      {
        id: "chef_ask2",
        verb: "ask",
        label: "Ask what he did not see",
        lines: [
          "“I don't remember him placing a real order. He had his laptop with him.”",
          "“Tonight? Cold starters print. Steaks — nothing. Not even a beep.”",
        ],
        evidence: ev(
          "E12",
          "E12",
          "🗣️",
          "NOBODY PLACED A REAL ORDER",
          "The chef saw printer tests, never an actual order flowing from the POS.",
          "context",
        ),
      },
    ],
  },

  /* ── COLD KITCHEN / DESSERTS / PASS ─────────────────────────── */
  {
    id: "prt_cold",
    name: "PRT-COLD KITCHEN",
    icon: "🖨️",
    zone: "cold",
    x: 1120,
    y: 60,
    blurb: "Epson TM-U220 · 192.168.1.204",
    actions: [
      {
        id: "cold_test",
        verb: "test",
        label: "Send a test print",
        lines: ["Burrata tickets from tonight are on the spike.", "Cold Kitchen is printing real orders."],
      },
    ],
  },
  {
    id: "cold_cook",
    name: "Cold line cook",
    icon: "🧑‍🍳",
    zone: "cold",
    x: 1250,
    y: 160,
    blurb: "Plating burrata",
    actions: [
      {
        id: "coldcook_ask",
        verb: "ask",
        label: "Ask about tonight",
        lines: ["“Everything I need prints. Salads, burrata, all fine.”", "“The hot side keeps shouting at me.”"],
      },
    ],
  },
  {
    id: "prt_dessert",
    name: "PRT-DESSERTS",
    icon: "🖨️",
    zone: "desserts",
    x: 1400,
    y: 60,
    blurb: "Epson TM-U220 · 192.168.1.205",
    actions: [
      {
        id: "dessert_test",
        verb: "test",
        label: "Send a test print",
        lines: ["Cheesecake ticket printed at 19:07 with the real order.", "Desserts route works end to end."],
      },
    ],
  },
  {
    id: "prt_pass",
    name: "PRT-KITCHEN PASS",
    icon: "🖨️",
    zone: "pass",
    x: 820,
    y: 350,
    blurb: "Epson TM-U220 · 192.168.1.202",
    actions: [
      {
        id: "pass_inspect",
        verb: "inspect",
        label: "Inspect the spool",
        lines: ["Drinks and course tickets printing normally.", "No hot-food lines anywhere on the roll."],
      },
    ],
  },
  {
    id: "spike",
    name: "Ticket spike",
    icon: "🧷",
    zone: "pass",
    x: 1150,
    y: 350,
    blurb: "Tonight's tickets",
    actions: [
      {
        id: "spike_inspect",
        verb: "inspect",
        label: "Flip through the tickets",
        lines: [
          "19:07 T4 · MAHOU → BAR ✅",
          "19:07 T4 · BURRATA → COLD KITCHEN ✅",
          "19:07 T4 · CHEESECAKE → DESSERTS ✅",
          "19:07 T4 · RIBEYE → (no ticket)",
        ],
        evidence: ev(
          "E13",
          "E13",
          "🧾",
          "THREE OUT OF FOUR",
          "Only the hot-food line is missing from the spike. The order itself reached the system.",
          "context",
        ),
      },
    ],
  },

  /* ── HOSTESS / RESTAURANT / BAR / POS 1 ─────────────────────── */
  {
    id: "prt_hostess",
    name: "PRT-HOSTESS DESK",
    icon: "🖨️",
    zone: "hostess",
    x: 60,
    y: 540,
    blurb: "Epson TM-T20 · 192.168.1.211",
    actions: [
      {
        id: "hostess_test",
        verb: "test",
        label: "Send a test print",
        lines: ["Receipt printer answers instantly.", "Reserved for welcome-desk receipts."],
      },
    ],
  },
  {
    id: "host_stand",
    name: "Reservation book",
    icon: "📕",
    zone: "hostess",
    x: 180,
    y: 660,
    blurb: "Tonight's floor plan",
    actions: [
      {
        id: "book_inspect",
        verb: "inspect",
        label: "Read the book",
        lines: ["19:30 PRIVATE EVENT · 60 covers", "Menu: Ribeye, Iberian pork, grilled octopus.", "Every headline dish is hot food."],
      },
    ],
  },
  {
    id: "table8",
    name: "Table 8",
    icon: "🍽️",
    zone: "restaurant",
    x: 520,
    y: 620,
    blurb: "First real order of the night",
    actions: [
      {
        id: "t8_inspect",
        verb: "inspect",
        label: "Check the table",
        lines: ["Beer served. Burrata served. Cheesecake plated.", "The ribeye never left the kitchen."],
      },
    ],
  },
  {
    id: "waiter_ipad",
    name: "Waiter iPad",
    icon: "📱",
    zone: "restaurant",
    x: 800,
    y: 560,
    blurb: "Handheld POS",
    actions: [
      {
        id: "ipad_inspect",
        verb: "inspect",
        label: "Open the order",
        lines: ["Order sent 19:07 · status SENT ✅", "All four lines accepted by the POS.", "No error returned to the waiter."],
      },
      {
        id: "ipad_trace",
        verb: "trace",
        label: "Trace the RIBEYE line",
        lines: [
          "ITEM RIBEYE 300g → ACCOUNTING GROUP VARIOS → PRODUCTION CENTER … ⌀",
          "Routing resolution ended with no destination. No error surfaced.",
        ],
      },
    ],
  },
  {
    id: "partner_phone",
    name: "Partner's phone",
    icon: "📲",
    zone: "restaurant",
    x: 960,
    y: 720,
    blurb: "Left face-up on the pass table",
    actions: [
      {
        id: "phone_inspect",
        verb: "inspect",
        label: "Read the chat",
        lines: [
          "17:36 PARTNER — “Menu imported 👍 Three warnings but everything looks there.”",
          "17:39 CONSULTANT — “Did you validate the routing after import?”",
          "17:41 PARTNER — “Yes, printers are all working.”",
        ],
        requires: ["E08"],
        lockedHint: "You need a reason to care about what the partner did at 17:34.",
        evidence: ev(
          "E14",
          "E14",
          "👤",
          "THE ANSWER THAT ANSWERS NOTHING",
          "Asked about routing validation, the partner replied about printers. Assumption, not proof.",
          "key",
        ),
      },
    ],
  },
  {
    id: "bartender",
    name: "Bartender",
    icon: "🧑‍🍳",
    zone: "bar",
    x: 1300,
    y: 660,
    blurb: "Pouring for table 8",
    actions: [
      {
        id: "bar_ask",
        verb: "ask",
        label: "Ask about the order",
        lines: ["“Mahou came through the second they sent it.”", "“Drinks are fine all night.”"],
      },
    ],
  },
  {
    id: "prt_pos1",
    name: "PRT-POS 1 RECEIPT",
    icon: "🧾",
    zone: "pos1",
    x: 1470,
    y: 540,
    blurb: "Epson TM-T20 · 192.168.1.201",
    actions: [
      {
        id: "pos1_test",
        verb: "test",
        label: "Print a receipt",
        lines: ["Fiscal receipt printed and numbered correctly.", "Payments and fiscal chain unaffected."],
      },
    ],
  },
  {
    id: "pos_terminal",
    name: "POS 1 terminal",
    icon: "💳",
    zone: "pos1",
    x: 1470,
    y: 700,
    blurb: "Payment terminal",
    actions: [
      {
        id: "pos_test",
        verb: "test",
        label: "Run a payment test",
        lines: ["Integrated payment €1.00 → APPROVED", "Terminal linked to POS 1. Nothing suspicious."],
      },
    ],
  },
];

export const objectById = (id: string) => OBJECTS.find((o) => o.id === id) ?? null;

export const ALL_EVIDENCE: Evidence[] = OBJECTS.flatMap((o) =>
  o.actions.flatMap((a) => (a.evidence ? [a.evidence] : [])),
);

export const KEY_EVIDENCE = ALL_EVIDENCE.filter((e) => e.kind === "key").map((e) => e.id);
export const HERRINGS = ALL_EVIDENCE.filter((e) => e.kind === "herring").map((e) => e.id);

/* ── Story ──────────────────────────────────────────────────── */

export const OPENING_ORDER = [
  { icon: "🍺", item: "Mahou", to: "BAR", ok: true },
  { icon: "🥗", item: "Burrata", to: "COLD KITCHEN", ok: true },
  { icon: "🥩", item: "Ribeye", to: "HOT KITCHEN", ok: false },
  { icon: "🍰", item: "Cheesecake", to: "DESSERTS", ok: true },
  { icon: "🧾", item: "Receipt", to: "POS 1", ok: true },
];

export const ESCALATION_ORDER = [
  { icon: "🥩", item: "Ribeye", ok: false },
  { icon: "🐙", item: "Grilled Octopus", ok: false },
  { icon: "🥗", item: "Caesar Salad", ok: true },
  { icon: "🍰", item: "Cheesecake", ok: true },
];

/* ── Accusation ─────────────────────────────────────────────── */

export type Choice = { id: string; label: string; icon: string };

export const Q_WHAT: Choice[] = [
  { id: "printer", label: "Printer", icon: "🖨️" },
  { id: "network", label: "Network", icon: "🌐" },
  { id: "configuration", label: "Configuration", icon: "⚙️" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "pms", label: "PMS", icon: "🏨" },
  { id: "fiscal", label: "Fiscal", icon: "🧾" },
];

export const Q_ROOT: Choice[] = [
  { id: "offline", label: "Hot Kitchen printer offline", icon: "🔌" },
  { id: "ip", label: "Wrong printer IP address", icon: "📡" },
  { id: "dinein", label: "Dine In excludes Hot Kitchen", icon: "📐" },
  { id: "varios", label: "Items fell back to Accounting Group VARIOS — no Production Center", icon: "⛓️‍💥" },
  { id: "profile", label: "Printing profile has no printer", icon: "🖨️" },
  { id: "tax", label: "Fiscal setup blocks production", icon: "🧾" },
];

export const Q_KILLER: Choice[] = [
  { id: "printer", label: "Printer", icon: "🖨️" },
  { id: "network", label: "Network", icon: "🌐" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "pms", label: "PMS", icon: "🏨" },
  { id: "configuration", label: "Configuration", icon: "⚙️" },
  { id: "fiscal", label: "Fiscal", icon: "🧾" },
  { id: "checklist", label: "Checklist", icon: "📋" },
  { id: "partner", label: "Partner Assumption", icon: "👤" },
];

export const Q_WEAPON: Choice[] = [
  { id: "failed_printer", label: "Failed printer", icon: "🖨️" },
  { id: "bad_ip", label: "Bad IP address", icon: "📡" },
  { id: "broken_config", label: "Broken configuration", icon: "⚙️" },
  { id: "unchecked_import", label: "Unchecked import warning", icon: "📥" },
  { id: "checklist", label: "Checklist without evidence", icon: "📋" },
  { id: "outage", label: "Network outage", icon: "⏱" },
];

export const Q_DECISION: Choice[] = [
  { id: "go", label: "GO", icon: "🟢" },
  { id: "conditional", label: "CONDITIONAL GO", icon: "🟠" },
  { id: "nogo", label: "NO-GO", icon: "🔴" },
];

export const SOLUTION = {
  what: "configuration",
  root: "varios",
  killer: "partner",
  weapon: "checklist",
  decision: "conditional",
};

export type Accusation = {
  what: string;
  root: string;
  killer: string;
  weapon: string;
  decision: string;
};

export const SOCRATIC = [
  "Can your theory explain why Cold Kitchen and Desserts printed successfully?",
  "If the hardware answers a ping, what part of the journey have you actually proven?",
  "Who decided the go-live was ready, and what did they hold in their hand when they decided it?",
];

export function isCorrect(a: Accusation) {
  return (
    a.what === SOLUTION.what &&
    a.root === SOLUTION.root &&
    a.killer === SOLUTION.killer &&
    a.weapon === SOLUTION.weapon
  );
}

export function scoreRun(opts: {
  a: Accusation;
  foundIds: string[];
  secondsLeft: number;
  wrongAttempts: number;
  interactions: number;
}) {
  const { a, foundIds, secondsLeft, wrongAttempts, interactions } = opts;
  let s = 0;
  if (a.what === SOLUTION.what) s += 150;
  if (a.root === SOLUTION.root) s += 250;
  if (a.killer === SOLUTION.killer) s += 250;
  if (a.weapon === SOLUTION.weapon) s += 100;
  const keys = KEY_EVIDENCE.filter((id) => foundIds.includes(id)).length;
  s += Math.round((keys / KEY_EVIDENCE.length) * 150);
  s += Math.round(Math.max(0, Math.min(1, secondsLeft / GAME_SECONDS)) * 100);
  if (a.decision === SOLUTION.decision) s += 50;
  s -= wrongAttempts * 150;
  if (isCorrect(a) && interactions <= 16) s += 50;
  return Math.max(0, s);
}
