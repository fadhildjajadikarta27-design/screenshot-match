import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, QrCode, Images, ShieldCheck, Smartphone, Zap, Download } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ApertureMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";
import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VELORA — Every Moment, Shared." },
      { name: "description", content: "One beautiful space for every photo from your event. Guests scan a QR code and upload — no app, no account." },
      { property: "og:title", content: "VELORA — Every Moment, Shared." },
      { property: "og:description", content: "One beautiful space for every photo from your event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Camera, title: "Create your event", body: "Name it, pick a date, choose who can see the album." },
  { icon: QrCode, title: "Share your QR code", body: "Print it on table cards or send the link — guests just scan." },
  { icon: Images, title: "Collect every photo", body: "Every guest's view of the day, gathered in one gallery." },
];

const benefits = [
  { icon: Smartphone, title: "No app for guests", body: "Opens in any phone browser. Upload in seconds." },
  { icon: ShieldCheck, title: "Private by choice", body: "Keep albums public or protect them with a PIN." },
  { icon: Zap, title: "Fast on any network", body: "Photos are compressed on the phone before upload." },
  { icon: Download, title: "Yours to keep", body: "Download originals whenever you choose to allow it." },
];

const uses = ["Weddings", "Birthdays", "Graduations", "Reunions", "Corporate events"];

function Landing() {
  const { t: tr, locale, language } = useLanguage();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-[1.05fr_1fr] md:pt-20">
          <div>
            <p className="eyebrow">{tr("Shared event albums")}</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] md:text-7xl">{tr("Every Moment, Shared.")}</h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              {tr("One beautiful space for every photo from your event.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>{tr("Create Your Event")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/demo">{tr("Explore Demo")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={hero}
              alt={tr("Wedding guests laughing at golden hour")}
              width={1600}
              height={1072}
              fetchPriority="high"
              className="aspect-[4/5] w-full rounded-2xl object-cover shadow-lift md:aspect-[4/5]"
            />
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
              <ApertureMark className="h-5 w-5" />
              <div className="text-sm">
                <p className="font-medium">{tr("248 photos")}</p>
                <p className="text-xs text-muted-foreground">{tr("from 61 guests")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="eyebrow">{tr("How it works")}</p>
            <h2 className="mt-3 font-display text-4xl">{tr("Three simple steps")}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={tr(s.title)}>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl text-gold">0{i + 1}</span>
                    <span className="gold-rule" />
                  </div>
                  <s.icon className="mt-5 h-6 w-6" strokeWidth={1.4} />
                  <h3 className="mt-3 text-lg font-medium">{tr(s.title)}</h3>
                  <p className="mt-1 text-muted-foreground">{tr(s.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{tr("Gallery preview")}</p>
              <h2 className="mt-3 font-display text-4xl">{tr("Everyone's view of the day")}</h2>
            </div>
            <Link to="/demo" className="hidden text-sm underline-offset-4 hover:underline sm:inline">{tr("View demo →")}</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[g1, g2, g3, g4].map((src, i) => (
              <img key={i} src={src} alt="" loading="lazy" width={768} height={960} className="aspect-[4/5] w-full rounded-xl object-cover" />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={tr(b.title)} className="rounded-2xl border border-border bg-card p-6">
                <b.icon className="h-5 w-5 text-gold" strokeWidth={1.6} />
                <h3 className="mt-4 font-medium">{tr(b.title)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tr(b.body)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 text-center">
            <p className="eyebrow">{tr("Made for")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3 font-display text-3xl">
              {uses.map((u) => <span key={tr(u)}>{tr(u)}</span>)}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>{tr("Create Your Event")}</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/pricing">{tr("See pricing")}</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
