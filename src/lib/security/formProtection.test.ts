import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cooldownSeconds,
  getCooldownRemainingMs,
  isHoneypotTriggered,
  isMinFillTimeReached,
  markSubmissionNow,
} from "./formProtection";

describe("formProtection helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("detects honeypot values", () => {
    expect(isHoneypotTriggered("")).toBe(false);
    expect(isHoneypotTriggered("   ")).toBe(false);
    expect(isHoneypotTriggered("spam-link")).toBe(true);
  });

  it("checks minimum fill time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-22T10:00:00Z"));
    const startedAt = Date.now();

    vi.setSystemTime(new Date("2026-02-22T10:00:01Z"));
    expect(isMinFillTimeReached(startedAt, 1500)).toBe(false);

    vi.setSystemTime(new Date("2026-02-22T10:00:03Z"));
    expect(isMinFillTimeReached(startedAt, 1500)).toBe(true);
  });

  it("stores and calculates cooldown windows", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-22T10:00:00Z"));

    const key = "cooldown-key";
    expect(getCooldownRemainingMs(key, 5000)).toBe(0);

    markSubmissionNow(key);
    expect(getCooldownRemainingMs(key, 5000)).toBe(5000);

    vi.setSystemTime(new Date("2026-02-22T10:00:03Z"));
    expect(getCooldownRemainingMs(key, 5000)).toBe(2000);
    expect(cooldownSeconds(2000)).toBe(2);
  });
});
