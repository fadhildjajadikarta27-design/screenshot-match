import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Images, Lock, Globe, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, EVENT_COLUMNS, type EventRecord } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/image-validation";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your events — VELORA" },
      { name: "description", content: "Manage your VELORA event albums." },
      { property: "og:title", content: "Your events — VELORA" },
      { property: "og:description", content: "Manage your VELORA event albums." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Row = EventRecord & { photoCount: number; bytes: number; lastUpload: string | null; coverUrl: string | null };

async function fetchEvents(): Promise<Row[]> {
  const [{ data: events, error }, { data: stats }] = await Promise.all([
    supabase.from("events").select(EVENT_COLUMNS).order("created_at", { ascending: false }),
    supabase.rpc("my_event_stats"),
  ]);
  if (error) throw error;
  const list = (events ?? []) as EventRecord[];
  const covers = list.filter((e) => e.cover_image_path).map((e) => e.cover_image_path!);
  const { data: signed } = covers.length
    ? await supabase.storage.from("event-photos").createSignedUrls(covers, 3600)
    : { data: [] };
  const coverMap = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const statMap = new Map((stats ?? []).map((s) => [s.event_id, s]));
  return list.map((e) => {
    const s = statMap.get(e.id);
    return {
      ...e,
      photoCount: Number(s?.photo_count ?? 0),
      bytes: Number(s?.total_bytes ?? 0),
      lastUpload: s?.last_upload ?? null,
      coverUrl: e.cover_image_path ? coverMap.get(e.cover_image_path) ?? null : null,
    };
  });
}

function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["my-events"], queryFn: fetchEvents });
  const totalBytes = (data ?? []).reduce((a, r) => a + r.bytes, 0);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 font-display text-4xl">Your events</h1>
          {data && data.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{data.length} events · {formatBytes(totalBytes)} stored</p>
          )}
        </div>
        <Button asChild><Link to="/events/new"><Plus /> New event</Link></Button>
      </div>

      {isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      )}
      {error && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p>We couldn't load your events.</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>Try again</Button>
        </div>
      )}
      {data && data.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Images className="mx-auto h-8 w-8 text-gold" strokeWidth={1.4} />
          <h2 className="mt-4 font-display text-3xl">No events yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">Create your first event to get a QR code your guests can scan.</p>
          <Button asChild className="mt-6"><Link to="/events/new"><Plus /> Create your first event</Link></Button>
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <li key={e.id}>
              <Link to="/events/$id" params={{ id: e.id }} className="group block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lift">
                <div className="aspect-[16/10] bg-muted">
                  {e.coverUrl ? (
                    <img src={e.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-4xl text-gold">{e.title.slice(0, 1)}</div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-2xl leading-tight">{e.title}</h2>
                    {e.privacy === "pin" ? <Lock className="h-4 w-4 text-muted-foreground" aria-label="PIN protected" /> : <Globe className="h-4 w-4 text-muted-foreground" aria-label="Public" />}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {e.event_date ? new Date(e.event_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "No date"}
                    {e.event_type ? ` · ${e.event_type}` : ""}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span>{e.photoCount} photos · {formatBytes(e.bytes)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${e.uploads_enabled ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"}`}>
                      {e.uploads_enabled ? "Uploads open" : "Uploads closed"}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
