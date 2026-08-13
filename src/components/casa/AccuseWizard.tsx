import { useState } from "react";
import {
  Q_DECISION,
  Q_KILLER,
  Q_ROOT,
  Q_WEAPON,
  Q_WHAT,
  type Accusation,
  type Choice,
} from "@/lib/case";

const STEPS: { key: keyof Accusation; title: string; icon: string; options: Choice[] }[] = [
  { key: "what", title: "What failed?", icon: "⚙️", options: Q_WHAT },
  { key: "root", title: "Root cause?", icon: "🧠", options: Q_ROOT },
  { key: "killer", title: "Who killed the go-live?", icon: "👤", options: Q_KILLER },
  { key: "weapon", title: "What was the weapon?", icon: "🔪", options: Q_WEAPON },
  { key: "decision", title: "Final decision", icon: "🚦", options: Q_DECISION },
];

export function AccuseWizard({
  attemptsLeft,
  onCancel,
  onSubmit,
}: {
  attemptsLeft: number;
  onCancel: () => void;
  onSubmit: (a: Accusation) => void;
}) {
  const [i, setI] = useState(0);
  const [a, setA] = useState<Partial<Accusation>>({});
  const [confirm, setConfirm] = useState(false);
  const step = STEPS[i]!;
  const picked = a[step.key];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
      <div className="panel noir-grain w-full max-w-3xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="label-caps text-destructive">
              🚨 Save the go-live · submitting uses 1 attempt · ❤️ {attemptsLeft} left
            </div>
            <h2 className="font-display text-3xl uppercase leading-none">
              {step.icon} {step.title}
            </h2>
          </div>
          <div className="font-display text-xl text-muted-foreground">
            {i + 1}/{STEPS.length}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {step.options.map((o) => (
            <button
              key={o.id}
              onClick={() => setA((p) => ({ ...p, [step.key]: o.id }))}
              className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left font-display text-sm uppercase tracking-wide transition ${
                picked === o.id
                  ? "ember-glow border-primary bg-primary/15 text-primary"
                  : "border-border hover:border-primary/60"
              }`}
            >
              <span className="text-2xl">{o.icon}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => (i === 0 ? onCancel() : setI(i - 1))}
            className="rounded-md border border-border px-4 py-2 font-display uppercase hover:border-primary hover:text-primary"
          >
            {i === 0 ? "Back to the case" : "Back"}
          </button>
          <button
            disabled={!picked}
            onClick={() => (i === STEPS.length - 1 ? setConfirm(true) : setI(i + 1))}
            className="rounded-md bg-primary px-6 py-3 font-display text-lg uppercase tracking-wider text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            {i === STEPS.length - 1 ? "Submit accusation" : "Next"}
          </button>
        </div>

        {confirm && (
          <div className="mt-5 rounded-md border border-destructive/60 bg-destructive/10 p-4">
            <p className="font-display text-xl uppercase leading-tight">
              This will consume one of your 3 attempts. Are you prepared to defend your conclusion?
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="rounded-md border border-border px-4 py-2 font-display uppercase"
              >
                Not yet
              </button>
              <button
                onClick={() => onSubmit(a as Accusation)}
                className="rounded-md bg-destructive px-5 py-2 font-display uppercase text-destructive-foreground hover:brightness-110"
              >
                🚨 Accuse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
