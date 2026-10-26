import { formatPrice } from "@/lib/locale-format";
import { useLanguage } from "@/components/LanguageProvider";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { recommendPackage, type Recommendation } from "@/lib/recommend.functions";
import { ADDONS, PLAN_TIERS, formatRupiah, priceFor, type AddonId, type AudienceId, type PlanId } from "@/lib/plans";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type Props = {
  eventType: string;
  audience: AudienceId;
  onApply: (plan: PlanId, addons: AddonId[]) => void;
};

export function PackageAdvisor({ eventType, audience, onApply }: Props) {
  const { t: tr, locale, language } = useLanguage();
  const recommend = useServerFn(recommendPackage);
  const [needs, setNeeds] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);

  async function ask() {
    setBusy(true); setError(null); setRec(null);
    try {
      const res = await recommend({ data: { eventType, audience, needs } });
      if (res.ok) setRec(res.rec); else setError(res.error);
    } catch (e) {
      setError(e instanceof Error && e.message.includes("detail") ? tr("Ceritakan kebutuhan acaramu sedikit lebih detail.") : tr("Rekomendasi gagal dibuat. Coba lagi."));
    } finally { setBusy(false); }
  }

  const total = rec ? priceFor(eventType, rec.plan, audience) + rec.addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price ?? 0), 0) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-gold/50 bg-accent/30 p-4">
      <p className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-gold" /> {tr("Bantu pilihkan paket")}</p>
      <p className="text-sm text-muted-foreground">{tr("Ceritakan tema dan kebutuhan acaramu, kami rekomendasikan paket dan add-on yang paling pas.")}</p>
      <Textarea
        value={needs}
        maxLength={1500}
        onChange={(e) => setNeeds(e.target.value)}
        placeholder={tr("Contoh: Resepsi adat Jawa di gedung, sekitar 500 tamu. Ingin foto tamu tampil di layar saat acara dan album disimpan lama untuk keluarga.")}
      />
      <Button type="button" variant="outline" onClick={ask} disabled={busy || needs.trim().length < 10}>
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {tr("Rekomendasikan")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {rec && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <p className="font-display text-xl">{tr("Paket")} {PLAN_TIERS[rec.plan].name}</p>
          {rec.addons.length > 0 && (
            <p className="text-sm">Add-on: {rec.addons.map((id) => ADDONS.find((a) => a.id === id)?.name).join(", ")}</p>
          )}
          <p className="text-sm text-muted-foreground">{rec.reason}</p>
          <p className="text-sm">{tr("Perkiraan total:")} <span className="font-medium">{formatPrice(total, language)}</span></p>
          <Button type="button" size="sm" onClick={() => onApply(rec.plan, rec.addons)}>{tr("Pakai rekomendasi ini")}</Button>
        </div>
      )}
    </div>
  );
}
