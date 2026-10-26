// Per-event package definitions. Display-only pricing (no payments yet).
export type PlanId = "free" | "basic" | "premium" | "exclusive";
export const PLAN_IDS: PlanId[] = ["free", "basic", "premium", "exclusive"];

export type PlanTier = {
  id: PlanId;
  name: string;
  maxPhotos: number;
  activeDays: number;
  zipDownload: boolean;
  hideBranding: boolean;
};

export const PLAN_TIERS: Record<PlanId, PlanTier> = {
  free: { id: "free", name: "Gratis", maxPhotos: 100, activeDays: 7, zipDownload: false, hideBranding: false },
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
    free: "Coba dulu untuk acara kecil.",
    basic: "Cocok untuk akad atau resepsi intim.",
    premium: "Cocok untuk resepsi hingga 500 tamu.",
    exclusive: "Untuk resepsi besar dengan album tanpa logo.",
  },
};
const CORPORATE: PriceRow = {
  basic: 199000, premium: 449000, exclusive: 899000,
  blurb: {
    free: "Coba untuk rapat atau acara internal.",
    basic: "Untuk gathering tim dan workshop.",
    premium: "Untuk seminar dan gala dinner.",
    exclusive: "Untuk konferensi, dengan album bermerek sendiri.",
  },
};
const SCHOOL: PriceRow = {
  basic: 99000, premium: 249000, exclusive: 499000,
  blurb: {
    free: "Coba untuk satu kelas.",
    basic: "Untuk satu angkatan kecil.",
    premium: "Untuk wisuda atau reuni satu angkatan.",
    exclusive: "Untuk acara sekolah atau kampus besar.",
  },
};
const FAMILY: PriceRow = {
  basic: 79000, premium: 199000, exclusive: 399000,
  blurb: {
    free: "Coba untuk kumpul keluarga.",
    basic: "Untuk pesta keluarga dan teman dekat.",
    premium: "Untuk perayaan besar bersama keluarga besar.",
    exclusive: "Untuk perayaan istimewa tanpa logo VELORA.",
  },
};

const PRICES: Record<string, PriceRow> = {
  Wedding: WEDDING, Engagement: WEDDING, Corporate: CORPORATE, Graduation: SCHOOL, Reunion: SCHOOL,
  Birthday: FAMILY, Anniversary: FAMILY, Aqiqah: FAMILY, Other: FAMILY,
};

export function priceFor(eventType: string | null | undefined, plan: PlanId): number {
  if (plan === "free") return 0;
  return (PRICES[eventType ?? "Other"] ?? FAMILY)[plan];
}

export function blurbFor(eventType: string | null | undefined, plan: PlanId): string {
  return (PRICES[eventType ?? "Other"] ?? FAMILY).blurb[plan];
}

export function formatRupiah(n: number) {
  if (n === 0) return "Rp 0";
  return `Rp ${Math.round(n / 1000)}rb`;
}

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && (PLAN_IDS as string[]).includes(v);
}

export function planOf(v: unknown): PlanTier {
  return PLAN_TIERS[isPlanId(v) ? v : "free"];
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
