import type { Language } from "./translations";

// Currency remains Indonesian rupiah in both languages.
export function formatPrice(amount: number, language: Language) {
  if (amount === 0) return language === "en" ? "Free" : "Gratis";
  return language === "en" ? `Rp ${amount.toLocaleString("en-GB")}` : `Rp ${Math.round(amount / 1000).toLocaleString("id-ID")}rb`;
}

export function formatDuration(days: number, language: Language) {
  return days >= 365 ? (language === "en" ? "1 year" : "1 tahun") : days >= 180 ? (language === "en" ? "6 months" : "6 bulan") : `${days} ${language === "en" ? "days" : "hari"}`;
}
