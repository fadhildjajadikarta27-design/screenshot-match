import { describe, expect, it } from "vitest";
import { PIN_RE, SLUG_RE, sanitizeFilename, sniffImageType } from "@/lib/image-validation";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("upload validation", () => {
  it("accepts real JPEG, PNG and WebP signatures", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });
  it("rejects non-images regardless of filename", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF
  });
  it("strips paths from client filenames", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\photos\\me.jpg")).toBe("me.jpg");
  });
  it("PIN must be 4-8 digits", () => {
    expect(PIN_RE.test("1234")).toBe(true);
    expect(PIN_RE.test("123")).toBe(false);
    expect(PIN_RE.test("123456789")).toBe(false);
    expect(PIN_RE.test("12a4")).toBe(false);
  });
  it("slug rules", () => {
    expect(SLUG_RE.test("amelia-james")).toBe(true);
    expect(SLUG_RE.test("-bad")).toBe(false);
    expect(SLUG_RE.test("UPPER")).toBe(false);
  });
});
