import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { InfoPage, metaFor } from "@/components/InfoPage";
import { Button } from "@/components/ui/button";
import { EVENT_TYPES, EVENT_TYPE_LABELS, PLAN_IDS, PLAN_TIERS, blurbFor, formatRupiah, priceFor } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => metaFor("Harga paket", "Paket VELORA per acara untuk wedding, wisuda, ulang tahun, dan lainnya."),
  component: Pricing,
});

function duration(days: number) {
  return days >= 365 ? "1 tahun" : days >= 180 ? "6 bulan" : `${days} hari`;
}

function Pricing() {
  const [type, setType] = useState<string>("Wedding");
  return (
    <InfoPage eyebrow="Harga" title="Paket per acara">
      <p>Bayar sekali untuk tiap acara. Pilih jenis acaramu untuk melihat harganya. Pembayaran online segera hadir.</p>
      <div className="not-prose mt-6 flex flex-wrap gap-2">
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-4 py-1.5 text-sm ${type === t ? "border-gold bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {EVENT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_IDS.map((id) => {
          const t = PLAN_TIERS[id];
          const feats: [string, boolean][] = [
            [id === "exclusive" ? "Foto tanpa batas" : `${t.maxPhotos.toLocaleString("id-ID")} foto`, true],
            [`Album aktif ${duration(t.activeDays)}`, true],
            ["Kode QR & kartu cetak", true],
            ["Unduh semua (ZIP)", t.zipDownload],
            ["Tanpa logo VELORA", t.hideBranding],
          ];
          return (
            <div key={id} className={`flex flex-col rounded-2xl border bg-card p-6 text-foreground ${id === "premium" ? "border-gold" : "border-border"}`}>
              <p className="eyebrow">{EVENT_TYPE_LABELS[type]}</p>
              <h2 className="!mt-2 font-display text-2xl">{t.name}</h2>
              <p className="mt-2 font-display text-4xl">{formatRupiah(priceFor(type, id))}</p>
              <p className="mt-2 text-sm text-muted-foreground">{blurbFor(type, id)}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {feats.map(([f, on]) => (
                  <li key={f} className={`flex gap-2 ${on ? "" : "text-muted-foreground line-through"}`}>
                    {on ? <Check className="h-4 w-4 shrink-0 text-gold" /> : <Minus className="h-4 w-4 shrink-0" />}{f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={id === "premium" ? "default" : "outline"} className="mt-6 w-full">
                <Link to="/auth" search={{ mode: "signup" }}>{id === "free" ? "Mulai gratis" : "Pilih paket"}</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </InfoPage>
  );
}
