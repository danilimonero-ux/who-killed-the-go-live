import emilija from "@/assets/inv-emilija.png";
import claudia from "@/assets/inv-claudia.png";
import mariia from "@/assets/inv-mariia.png";
import rick from "@/assets/inv-rick.png";
import riccardo from "@/assets/inv-riccardo.png";
import sander from "@/assets/inv-sander.png";

export type Investigator = {
  id: string;
  name: string;
  short: string;
  role: string;
  icon: string;
  /** accent colour used for pins, outlines and badges */
  accent: string;
  portrait: string;
};

/** Flavour only — every investigator has exactly the same tools and access. */
export const INVESTIGATORS: Investigator[] = [
  {
    id: "training",
    name: "Emilija Vasic",
    short: "Emilija",
    role: "Training Profiler",
    icon: "🎓",
    accent: "#f0b32a",
    portrait: emilija,
  },
  {
    id: "enablement",
    name: "Claudia D’Alessandro",
    short: "Claudia",
    role: "Enablement Detective",
    icon: "🔍",
    accent: "#ef5f8c",
    portrait: claudia,
  },
  {
    id: "support",
    name: "Mariia Sudiarova",
    short: "Mariia",
    role: "Support Specialist",
    icon: "🎧",
    accent: "#a78bfa",
    portrait: mariia,
  },
  {
    id: "hardware",
    name: "Rick van der Meer",
    short: "Rick",
    role: "Hardware Detective",
    icon: "🔧",
    accent: "#38bdf8",
    portrait: rick,
  },
  {
    id: "config",
    name: "Riccardo Marelli",
    short: "Riccardo",
    role: "Configuration Inspector",
    icon: "⚙️",
    accent: "#4ade80",
    portrait: riccardo,
  },
  {
    id: "judge",
    name: "Sander van Mulders",
    short: "Sander",
    role: "Launch Judge",
    icon: "⚖️",
    accent: "#fb923c",
    portrait: sander,
  },
];

export const investigatorById = (id: string | null | undefined) =>
  INVESTIGATORS.find((i) => i.id === id) ?? null;
