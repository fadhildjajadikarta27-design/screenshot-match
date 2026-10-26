import { formatPrice } from "@/lib/locale-format";
import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { InfoPage, metaFor } from "@/components/InfoPage";
import { Button } from "@/components/ui/button";
import { ADDONS, AUDIENCE, AUDIENCE_IDS, EVENT_TYPES, EVENT_TYPE_LABELS, PLAN_IDS, PLAN_TIERS, blurbFor, formatRupiah, priceFor, type AudienceId } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => metaFor("Harga paket", "Paket VELORA per acara untuk wedding, wisuda, ulang tahun, dan lainnya."),
  component: Pricing,
});

function duration(days: number) {
  return days >= 365 ? "1 tahun" : days >= 180 ? "6 bulan" : `${days} hari`;
}

function Pricing() {
  const { t: tr, locale, language } = useLanguage();
  const [type, setType] = useState<string>(tr("Wedding"));
  const [aud, setAud] = useState<AudienceId>("s");
  return (
    <InfoPage eyebrow={tr("Harga")} title={tr("Paket per acara")}>
      <p>{tr("Bayar sekali untuk tiap acara. Harga menyesuaikan jenis acara dan perkiraan jumlah tamu. Tidak ada paket gratis — tapi kamu bisa mencoba paket Exclusive dengan 20 foto gratis. Pembayaran online segera hadir.")}</p>
      <div className="not-prose mt-6 flex flex-wrap gap-2">
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-4 py-1.5 text-sm ${type === t ? "border-gold bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {tr(EVENT_TYPE_LABELS[t])}
          </button>
        ))}
      </div>
      <div className="not-prose mt-4 flex flex-wrap gap-2">
        {AUDIENCE_IDS.map((a) => (
          <button key={a} onClick={() => setAud(a)} className={`rounded-full border px-3 py-1 text-xs ${aud === a ? "border-gold bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {tr(AUDIENCE[a].label)}
          </button>
        ))}
      </div>
      <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_IDS.map((id) => {
          const t = PLAN_TIERS[id];
          const feats: [string, boolean][] = [
            [`${t.maxPhotos.toLocaleString(locale)} foto`, true],
            [`Album aktif ${duration(t.activeDays)}`, true],
            [tr("Kode QR & kartu cetak"), true],
            [tr("Unduh semua (ZIP)"), t.zipDownload],
            [tr("Tanpa logo VELORA"), t.hideBranding],
          ];
          return (
            <div key={id} className={`flex flex-col rounded-2xl border bg-card p-6 text-foreground ${id === "premium" ? "border-gold" : "border-border"}`}>
              <p className="eyebrow">{tr(EVENT_TYPE_LABELS[type])}</p>
              <h2 className="!mt-2 font-display text-2xl">{tr(t.name)}</h2>
              <p className="mt-2 font-display text-4xl">{formatPrice(priceFor(type, id, aud), language)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tr(blurbFor(type, id))}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {feats.map(([f, on]) => (
                  <li key={f} className={`flex gap-2 ${on ? "" : "text-muted-foreground line-through"}`}>
                    {on ? <Check className="h-4 w-4 shrink-0 text-gold" /> : <Minus className="h-4 w-4 shrink-0" />}{f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={id === "premium" ? "default" : "outline"} className="mt-6 w-full">
                <Link to="/auth" search={{ mode: "signup" }}>{id === "trial" ? tr("Coba gratis") : tr("Pilih paket")}</Link>
              </Button>
            </div>
          );
        })}
      </div>
      <h2 className="mt-10">{tr("Add-on")}</h2>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
        {ADDONS.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4 text-foreground">
            <p className="font-medium">{tr(a.name)} · {formatPrice(a.price, language)}</p>
            <p className="text-sm text-muted-foreground">{tr(a.desc)}</p>
          </div>
        ))}
      </div>
      <p className="mt-6">{tr("Bingung memilih? Saat membuat acara, ceritakan kebutuhanmu dan kami rekomendasikan paket serta add-on yang paling cocok.")}</p>
    </InfoPage>
  );
}
