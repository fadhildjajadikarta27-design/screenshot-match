// Per-event package definitions. Display-only pricing (no payments yet).
export type PlanId = "trial" | "basic" | "premium" | "exclusive";
export const PLAN_IDS: PlanId[] = ["trial", "basic", "premium", "exclusive"];
export const PAID_PLAN_IDS: PlanId[] = ["basic", "premium", "exclusive"];

export type PlanTier = {
  id: PlanId;
  name: string;
  maxPhotos: number;
  activeDays: number;
  zipDownload: boolean;
  hideBranding: boolean;
};

export const PLAN_TIERS: Record<PlanId, PlanTier> = {
  // Free trial = Exclusive features, limited to 20 photos for 7 days.
  trial: { id: "trial", name: "Free Trial Exclusive", maxPhotos: 20, activeDays: 7, zipDownload: true, hideBranding: true },
  basic: { id: "basic", name: "Basic", maxPhotos: 500, activeDays: 30, zipDownload: false, hideBranding: false },
  premium: { id: "premium", name: "Premium", maxPhotos: 2000, activeDays: 182, zipDownload: true, hideBranding: false },
  exclusive: { id: "exclusive", name: "Exclusive", maxPhotos: 20000, activeDays: 365, zipDownload: true, hideBranding: true },
};

export const EVENT_TYPES = [
  "Wedding", "Engagement", "Birthday", "Graduation", "Anniversary", "Aqiqah", "Reunion", "Corporate", "Other",
] as const;

export const EVENT_TYPE_LABELS: Record<string, string> = {
  Wedding: "Wedding", Engagement: "Lamaran", Birthday: "Birthday", Graduation: "Graduation",
  Anniversary: "Anniversary", Aqiqah: "Aqiqah / Syukuran", Reunion: "Reunion", Corporate: "Corporate", Other: "Lainnya",
};

type PriceRow = { basic: number; premium: number; exclusive: number; blurb: Record<PlanId, string> };

const WEDDING: PriceRow = {
  basic: 149000, premium: 349000, exclusive: 699000,
  blurb: {
    trial: "Coba semua fitur Exclusive dengan 20 foto gratis.",
    basic: "Cocok untuk akad atau resepsi intim.",
    premium: "Cocok untuk resepsi hingga 500 tamu.",
    exclusive: "Untuk resepsi besar dengan album tanpa logo.",
  },
};
const CORPORATE: PriceRow = {
  basic: 199000, premium: 449000, exclusive: 899000,
  blurb: {
    trial: "Coba semua fitur Exclusive dengan 20 foto gratis.",
    basic: "Untuk gathering tim dan workshop.",
    premium: "Untuk seminar dan gala dinner.",
    exclusive: "Untuk konferensi, dengan album bermerek sendiri.",
  },
};
const SCHOOL: PriceRow = {
  basic: 99000, premium: 249000, exclusive: 499000,
  blurb: {
    trial: "Coba semua fitur Exclusive dengan 20 foto gratis.",
    basic: "Untuk satu angkatan kecil.",
    premium: "Untuk wisuda atau reuni satu angkatan.",
    exclusive: "Untuk acara sekolah atau kampus besar.",
  },
};
const FAMILY: PriceRow = {
  basic: 79000, premium: 199000, exclusive: 399000,
  blurb: {
    trial: "Coba semua fitur Exclusive dengan 20 foto gratis.",
    basic: "Untuk pesta keluarga dan teman dekat.",
    premium: "Untuk perayaan besar bersama keluarga besar.",
    exclusive: "Untuk perayaan istimewa tanpa logo VELORA.",
  },
};

const PRICES: Record<string, PriceRow> = {
  Wedding: WEDDING, Engagement: WEDDING, Corporate: CORPORATE, Graduation: SCHOOL, Reunion: SCHOOL,
  Birthday: FAMILY, Anniversary: FAMILY, Aqiqah: FAMILY, Other: FAMILY,
};

export type AudienceId = "s" | "m" | "l" | "xl" | "xxl";
export const AUDIENCE_IDS: AudienceId[] = ["s", "m", "l", "xl", "xxl"];
export const AUDIENCE: Record<AudienceId, { label: string; multiplier: number }> = {
  s: { label: "Hingga 100 tamu", multiplier: 1 },
  m: { label: "101–300 tamu", multiplier: 1.5 },
  l: { label: "301–700 tamu", multiplier: 2 },
  xl: { label: "701–1.500 tamu", multiplier: 3 },
  xxl: { label: "Lebih dari 1.500 tamu", multiplier: 4 },
};
export function isAudienceId(v: unknown): v is AudienceId {
  return typeof v === "string" && (AUDIENCE_IDS as string[]).includes(v);
}

/** Price = base per event type × audience-size multiplier, rounded UP so the price always ends in 9 (e.g. 529.000). Trial is always free. */
export function priceFor(eventType: string | null | undefined, plan: PlanId, audience: AudienceId = "s"): number {
  if (plan === "trial") return 0;
  const base = (PRICES[eventType ?? "Other"] ?? FAMILY)[plan];
  return Math.ceil((base * AUDIENCE[audience].multiplier) / 10000) * 10000 - 1000;
}

export type AddonId = "slideshow" | "extra_photos";
export const ADDONS: { id: AddonId; name: string; price: number; desc: string }[] = [
  { id: "slideshow", name: "Live slideshow", price: 199000, desc: "Tampilkan foto tamu langsung di layar acara." },
  { id: "extra_photos", name: "+1.000 foto", price: 99000, desc: "Tambahan kuota foto untuk album." },
];
export const ADDON_IDS = ADDONS.map((a) => a.id);
export function isAddonId(v: unknown): v is AddonId {
  return typeof v === "string" && (ADDON_IDS as string[]).includes(v);
}

export function blurbFor(eventType: string | null | undefined, plan: PlanId): string {
  return (PRICES[eventType ?? "Other"] ?? FAMILY).blurb[plan];
}

export function formatRupiah(n: number) {
  if (n === 0) return "Gratis";
  return `Rp ${Math.round(n / 1000).toLocaleString("id-ID")}rb`;
}

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && (PLAN_IDS as string[]).includes(v);
}

export function planOf(v: unknown): PlanTier {
  return PLAN_TIERS[isPlanId(v) ? v : "trial"];
}

/** Album expiry: counted from the event date (or now if none / in the past). */
export function computeExpiresAt(plan: PlanId, eventDate: string | null, now = new Date()): string {
  const d = eventDate ? new Date(eventDate) : now;
  const start = isNaN(d.getTime()) || d < now ? now : d;
  return new Date(start.getTime() + PLAN_TIERS[plan].activeDays * 86400000).toISOString();
}

export function isExpired(expiresAt: string | null | undefined, now = new Date()) {
  return !!expiresAt && new Date(expiresAt) <= now;
}
