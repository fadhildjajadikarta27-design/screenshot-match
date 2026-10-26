import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/Lightbox";
import hero from "@/assets/hero.jpg";
import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo album — VELORA" },
      { name: "description", content: "See what a VELORA shared event album looks like for your guests." },
      { property: "og:title", content: "Demo album — VELORA" },
      { property: "og:description", content: "See what a VELORA shared event album looks like." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Demo,
});

const photos = [hero, g1, g2, g3, g4, g1, g4, g2].map((src, i) => ({ id: String(i), src }));

function Demo() {
  const { t: tr, locale, language } = useLanguage();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="eyebrow">{tr("Sample album · illustrative photos")}</p>
        <h1 className="mt-3 font-display text-5xl">Ayu &amp; Bima</h1>
        <p className="mt-2 text-muted-foreground">{tr("Wedding")} · {new Date("2026-06-14T12:00:00Z").toLocaleDateString(locale, { dateStyle: "long" })} · {photos.length} {tr("photos")}</p>
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {tr("This is how guests see an album after scanning your QR code. Create your own event to try real uploads.")}
          <div className="mt-4"><Button asChild><Link to="/auth" search={{ mode: "signup" }}>{tr("Create Your Event")}</Link></Button></div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setOpen(i)} className="overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
              <img src={p.src} alt={`${language === "en" ? "Demo photo" : "Foto demo"} ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover transition-transform hover:scale-[1.02]" />
            </button>
          ))}
        </div>
      </main>
      {open !== null && (
        <Lightbox
          count={photos.length}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          resolveUrl={async (i) => photos[i]?.src ?? null}
        />
      )}
      <SiteFooter />
    </div>
  );
}
