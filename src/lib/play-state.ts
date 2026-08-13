import { useCallback, useEffect, useState } from "react";

export type PrivateState = {
  found: string[];
  done: string[];
  interactions: number;
  escalated: boolean;
};

const EMPTY: PrivateState = { found: [], done: [], interactions: 0, escalated: false };

const key = (code: string, playerId: string) => `cf:${code.toUpperCase()}:${playerId}`;

export function usePrivateCase(code: string, playerId: string | null) {
  const [state, setState] = useState<PrivateState>(EMPTY);

  useEffect(() => {
    if (!playerId) return;
    try {
      const raw = localStorage.getItem(key(code, playerId));
      setState(raw ? { ...EMPTY, ...(JSON.parse(raw) as PrivateState) } : EMPTY);
    } catch {
      setState(EMPTY);
    }
  }, [code, playerId]);

  const persist = useCallback(
    (next: PrivateState) => {
      setState(next);
      if (!playerId) return;
      try {
        localStorage.setItem(key(code, playerId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [code, playerId],
  );

  const record = useCallback(
    (actionId: string, evidenceId?: string) =>
      setState((s) => {
        const next: PrivateState = {
          ...s,
          done: s.done.includes(actionId) ? s.done : [...s.done, actionId],
          interactions: s.interactions + 1,
          found: evidenceId && !s.found.includes(evidenceId) ? [...s.found, evidenceId] : s.found,
        };
        if (playerId) {
          try {
            localStorage.setItem(key(code, playerId), JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      }),
    [code, playerId],
  );

  const escalate = useCallback(
    () =>
      setState((s) => {
        if (s.escalated) return s;
        const next = { ...s, escalated: true };
        if (playerId) {
          try {
            localStorage.setItem(key(code, playerId), JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      }),
    [code, playerId],
  );

  const reset = useCallback(() => persist(EMPTY), [persist]);

  return { state, record, reset, escalate };
}
