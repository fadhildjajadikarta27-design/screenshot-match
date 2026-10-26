import { describe, expect, it } from "vitest";
import { PLAN_TIERS, computeExpiresAt, isExpired, priceFor } from "@/lib/plans";

describe("plans", () => {
  it("prices differ per event type", () => {
    expect(priceFor("Wedding", "premium")).toBe(349000);
    expect(priceFor("Corporate", "exclusive")).toBe(899000);
    expect(priceFor("Graduation", "basic")).toBe(99000);
    expect(priceFor("Birthday", "premium")).toBe(199000);
    expect(priceFor("Wedding", "free")).toBe(0);
  });
  it("photo limits per tier", () => {
    expect(PLAN_TIERS.free.maxPhotos).toBe(100);
    expect(PLAN_TIERS.basic.maxPhotos).toBe(500);
    expect(PLAN_TIERS.premium.maxPhotos).toBe(2000);
  });
  it("zip and branding features", () => {
    expect(PLAN_TIERS.basic.zipDownload).toBe(false);
    expect(PLAN_TIERS.premium.zipDownload).toBe(true);
    expect(PLAN_TIERS.premium.hideBranding).toBe(false);
    expect(PLAN_TIERS.exclusive.hideBranding).toBe(true);
  });
  it("free album lasts 7 days", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const exp = computeExpiresAt("free", null, now);
    expect(exp).toBe("2026-01-08T00:00:00.000Z");
    expect(isExpired(exp, new Date("2026-01-09T00:00:00Z"))).toBe(true);
    expect(isExpired(exp, new Date("2026-01-05T00:00:00Z"))).toBe(false);
  });
});
