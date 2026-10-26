import { useLanguage } from "@/components/LanguageProvider";
import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "./SiteChrome";

export function InfoPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  const { t: tr, locale, language } = useLanguage();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">{tr(eyebrow)}</p>
        <h1 className="mt-3 font-display text-5xl">{tr(title)}</h1>
        <div className="mt-8 space-y-4 leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-foreground">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function metaFor(title: string, description: string) {
  return {
    meta: [
      { title: `${tr(title)} — VELORA` },
      { name: "description", content: description },
      { property: "og:title", content: `${tr(title)} — VELORA` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
