const ATTEMPTS_KEY = "sfa_admin_login_attempts_v1";
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

type AttemptState = {
  attempts: number[];
  lockUntil: number;
};

const defaultState: AttemptState = {
  attempts: [],
  lockUntil: 0,
};

const loadState = (): AttemptState => {
  try {
    const raw = window.localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter((value) => Number.isFinite(value)).map(Number) : [],
      lockUntil: Number.isFinite(parsed.lockUntil) ? Number(parsed.lockUntil) : 0,
    };
  } catch {
    return defaultState;
  }
};

const saveState = (state: AttemptState) => {
  try {
    window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
  } catch {
    // no-op when storage is unavailable
  }
};

const pruneAttempts = (attempts: number[], now: number): number[] => attempts.filter((time) => now - time <= WINDOW_MS);

export const getAdminLoginLockRemainingMs = (): number => {
  const now = Date.now();
  const state = loadState();
  const lockRemaining = Math.max(0, state.lockUntil - now);

  if (lockRemaining > 0) return lockRemaining;

  const pruned = pruneAttempts(state.attempts, now);
  if (pruned.length !== state.attempts.length || state.lockUntil !== 0) {
    saveState({ attempts: pruned, lockUntil: 0 });
  }

  return 0;
};

export const recordAdminLoginFailure = (): number => {
  const now = Date.now();
  const state = loadState();

  if (state.lockUntil > now) {
    return state.lockUntil - now;
  }

  const attempts = [...pruneAttempts(state.attempts, now), now];
  const shouldLock = attempts.length >= MAX_ATTEMPTS;
  const lockUntil = shouldLock ? now + LOCKOUT_MS : 0;

  saveState({
    attempts: shouldLock ? [] : attempts,
    lockUntil,
  });

  return lockUntil > 0 ? LOCKOUT_MS : 0;
};

export const clearAdminLoginFailures = () => {
  saveState(defaultState);
};

export const lockoutSeconds = (remainingMs: number): number => Math.ceil(remainingMs / 1000);
