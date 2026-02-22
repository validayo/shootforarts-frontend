const isBrowser = typeof window !== "undefined";

export const isHoneypotTriggered = (value: string) => value.trim().length > 0;

export const isMinFillTimeReached = (startedAtMs: number, minFillMs: number) => Date.now() - startedAtMs >= minFillMs;

export const getCooldownRemainingMs = (storageKey: string, cooldownMs: number) => {
  if (!isBrowser) return 0;
  const raw = window.localStorage.getItem(storageKey);
  const lastAttempt = raw ? Number(raw) : NaN;
  if (!Number.isFinite(lastAttempt) || lastAttempt <= 0) return 0;
  const elapsed = Date.now() - lastAttempt;
  return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
};

export const markSubmissionNow = (storageKey: string) => {
  if (!isBrowser) return;
  window.localStorage.setItem(storageKey, String(Date.now()));
};

export const cooldownSeconds = (remainingMs: number) => Math.max(1, Math.ceil(remainingMs / 1000));
