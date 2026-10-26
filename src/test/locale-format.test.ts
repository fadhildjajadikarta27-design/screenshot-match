import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/locale-format";
import { priceFor } from "@/lib/plans";

describe("localized rupiah prices", () => {
  it("keeps the 529000 wedding premium price in either language", () => {
    const amount = priceFor("Wedding", "premium", "m");
    expect(amount).toBe(529000);
    expect(formatPrice(amount, "en")).toBe("Rp 529,000");
    expect(formatPrice(amount, "id")).toBe("Rp 529rb");
  });
});