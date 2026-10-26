import { describe, expect, it } from "vitest";
import { PLAN_IDS, PLAN_TIERS, computeExpiresAt, isExpired, priceFor } from "@/lib/plans";

describe("plans", () => {
  it("prices differ per event type", () => {
    expect(priceFor("Wedding", "premium")).toBe(349000);
    expect(priceFor("Corporate", "exclusive")).toBe(899000);
    expect(priceFor("Graduation", "basic")).toBe(99000);
    expect(priceFor("Birthday", "premium")).toBe(199000);
  });
  it("prices scale with audience size", () => {
    expect(priceFor("Wedding", "premium", "m")).toBe(529000);
    expect(priceFor("Wedding", "premium", "l")).toBe(699000);
    expect(priceFor("Wedding", "premium", "xxl")).toBe(1399000);
  });
  it("every price ends in 9 (nanggung)", () => {
    for (const type of EVENT_TYPES) {
      for (const plan of PAID_PLAN_IDS) {
        for (const aud of AUDIENCE_IDS) {
          expect(priceFor(type, plan, aud) % 10000).toBe(9000);
        }
      }
    }
  });
  it("only two add-ons: slideshow 199rb, extra photos 99rb", () => {
    expect(ADDONS).toHaveLength(2);
    expect(ADDONS.find((a) => a.id === "slideshow")?.price).toBe(199000);
    expect(ADDONS.find((a) => a.id === "extra_photos")?.price).toBe(99000);
  });
  it("no free plan; trial is 20 free photos of Exclusive", () => {
    expect(PLAN_IDS).not.toContain("free");
    expect(priceFor("Wedding", "trial", "xxl")).toBe(0);
    expect(PLAN_TIERS.trial.maxPhotos).toBe(20);
    expect(PLAN_TIERS.trial.hideBranding).toBe(PLAN_TIERS.exclusive.hideBranding);
    expect(PLAN_TIERS.trial.zipDownload).toBe(true);
  });
  it("photo limits per tier", () => {
    expect(PLAN_TIERS.basic.maxPhotos).toBe(500);
    expect(PLAN_TIERS.premium.maxPhotos).toBe(2000);
  });
  it("trial album lasts 7 days", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const exp = computeExpiresAt("trial", null, now);
    expect(exp).toBe("2026-01-08T00:00:00.000Z");
    expect(isExpired(exp, new Date("2026-01-09T00:00:00Z"))).toBe(true);
  });
});
