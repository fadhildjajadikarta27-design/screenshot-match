import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Logo";
import { eventUrl, useQrDataUrl } from "@/components/EventQr";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/events/$id_/print")({
  head: () => ({
    meta: [
      { title: "QR card — VELORA" },
      { name: "description", content: "Printable QR card for your event." },
      { property: "og:title", content: "QR card — VELORA" },
      { property: "og:description", content: "Printable QR card for your event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintCard,
});

function PrintCard() {
  const { id } = Route.useParams();
  const { data: ev } = useQuery({
    queryKey: ["event-print", id],
    queryFn: async () => (await supabase.from("events").select("title,slug,event_date").eq("id", id).maybeSingle()).data,
  });
  const qr = useQrDataUrl(ev ? eventUrl(ev.slug) : "", 900);
  if (!ev) return <div className="p-10">Loading…</div>;
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 py-8">
      <div className="no-print mb-6 flex gap-2">
        <Button variant="outline" asChild><Link to="/events/$id" params={{ id }}>← Back</Link></Button>
        <Button onClick={() => window.print()}><Printer /> Print</Button>
      </div>
      <article className="w-full max-w-[420px] rounded-2xl border border-border bg-card px-10 py-12 text-center shadow-soft print:border-0 print:shadow-none">
        <Wordmark linked={false} className="justify-center" />
        <div className="mx-auto mt-6 gold-rule" />
        <h1 className="mt-6 font-display text-4xl leading-tight">{ev.title}</h1>
        {ev.event_date && <p className="mt-2 text-sm text-muted-foreground">{new Date(ev.event_date).toLocaleDateString(undefined, { dateStyle: "long" })}</p>}
        {qr && <img src={qr} alt="Event QR code" className="mx-auto mt-8 aspect-square w-64" />}
        <p className="mt-6 font-display text-2xl">Share your photos</p>
        <p className="mt-1 text-sm text-muted-foreground">Scan with your phone camera — no app needed.</p>
        <p className="mt-6 eyebrow">Every Moment, Shared.</p>
      </article>
    </div>
  );
}
