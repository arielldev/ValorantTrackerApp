import { useNow } from "./useNow";

export interface Countdown {
  remaining: number;
  fraction: number;
}

export function useCountdown(expiresAt: number | null | undefined, totalSeconds = 86400): Countdown {
  const now = useNow();
  if (!expiresAt) return { remaining: 0, fraction: 0 };
  const remaining = Math.max(0, expiresAt - now);
  const fraction = Math.min(1, remaining / totalSeconds);
  return { remaining, fraction };
}
