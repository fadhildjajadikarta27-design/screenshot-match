import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, Printer, Share2, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, EVENT_COLUMNS, type EventRecord } from "@/components/AdminShell";
import { EventForm } from "@/components/EventForm";
import { eventUrl, useQrDataUrl } from "@/components/EventQr";
import { Lightbox } from "@/components/Lightbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteEvent, deletePhoto } from "@/lib/admin.functions";
import { formatBytes } from "@/lib/image-validation";
import { isExpired, planOf } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({
    meta: [
      { title: "Manage event — VELORA" },
      { name: "description", content: "Share, review and configure your event album." },
      { property: "og:title", content: "Manage event — VELORA" },
      { property: "og:description", content: "Share, review and configure your event album." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManageEvent,
});

function ManageEvent() {
  const { t: tr, locale, language } = useLanguage();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const del = useServerFn(deleteEvent);
  const [deleting, setDeleting] = useState(false);
  const { data: ev, isLoading, refetch } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).eq(tr("id"), id).maybeSingle();
      if (error) throw error;
      return data as EventRecord | null;
    },
  });

  if (isLoading) return <AdminShell><Skeleton className="h-96 rounded-2xl" /></AdminShell>;
  if (!ev)
    return (
      <AdminShell>
        <p>{tr("This event doesn't exist or isn't yours.")}</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/dashboard">{tr("Back to events")}</Link></Button>
      </AdminShell>
    );

  return (
    <AdminShell>
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">{tr("← Events")}</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{ev.event_type ?? tr("Event")}</p>
          <h1 className="mt-1 font-display text-4xl">{ev.title}</h1>
        </div>
        <Button asChild variant="outline"><a href={`/e/${ev.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> {tr("Open guest page")}</a></Button>
      </div>

      <Tabs defaultValue="share" className="mt-8">
        <TabsList>
          <TabsTrigger value="share">{tr("Share")}</TabsTrigger>
          <TabsTrigger value="photos">{tr("Photos")}</TabsTrigger>
          <TabsTrigger value="settings">{tr("Settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="share" className="mt-6"><SharePanel ev={ev} /></TabsContent>
        <TabsContent value="photos" className="mt-6"><PhotosPanel ev={ev} /></TabsContent>
        <TabsContent value="settings" className="mt-6 max-w-2xl">
          <EventForm
            initial={ev}
            onSaved={() => {
              refetch();
              qc.invalidateQueries({ queryKey: ["my-events"] });
            }}
          />
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-card p-6">
            <h2 className="font-display text-2xl">{tr("Delete event")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tr("Permanently removes the event and every photo in it.")}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4" disabled={deleting}>
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} {tr("Delete event")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{ev.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>{tr("All photos will be permanently deleted. This can't be undone.")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeleting(true);
                      const r = await del({ data: { id: ev.id } });
                      setDeleting(false);
                      if (!r.ok) { toast.error(r.error); return; }
                      toast.success(tr("Event deleted"));
                      qc.invalidateQueries({ queryKey: ["my-events"] });
                      navigate({ to: "/dashboard" });
                    }}
                  >
                    {tr("Delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function SharePanel({ ev }: { ev: EventRecord }) {
  const { t: tr, locale, language } = useLanguage();
  const url = eventUrl(ev.slug);
  const qr = useQrDataUrl(url, 1024);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-border bg-card p-5">
        {qr ? <img src={qr} alt={`QR code for ${ev.title}`} width={1024} height={1024} className="aspect-square w-full" /> : <Skeleton className="aspect-square w-full" />}
      </div>
      <div className="space-y-5">
        <div>
          <p className="eyebrow">{tr("Guest link")}</p>
          <p className="mt-2 break-all rounded-lg border border-border bg-card px-4 py-3 text-sm">{url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigator.clipboard.writeText(url).then(() => toast.success(tr("Link copied")), () => toast.error(tr("Couldn't copy")))}><Copy /> {tr("Copy link")}</Button>
          {canShare && (
            <Button variant="outline" onClick={() => navigator.share({ title: ev.title, text: `Share your photos from ${ev.title}`, url }).catch(() => {})}><Share2 /> {tr("Share")}</Button>
          )}
          <Button variant="outline" asChild disabled={!qr}>
            <a href={qr ?? "#"} download={`velora-${ev.slug}-qr.png`}><Download /> {tr("Download QR (PNG)")}</a>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/events/$id/print" params={{ id: ev.id }}><Printer /> {tr("Print QR card")}</Link>
          </Button>
        </div>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>{tr("Paket:")} {planOf(ev.plan).name} · Maks {planOf(ev.plan).maxPhotos.toLocaleString(locale)} {tr("foto")}</li>
          <li>{ev.expires_at ? `${isExpired(ev.expires_at) ? tr("Album berakhir") : tr("Album aktif sampai")} ${new Date(ev.expires_at).toLocaleDateString(locale, { dateStyle: "long" })}` : tr("Tanpa tanggal berakhir")}</li>
          <li>Access: {ev.privacy === "pin" ? tr("PIN protected") : tr("Anyone with the link")}</li>
          <li>Uploads: {ev.uploads_enabled ? tr("Open") : tr("Closed")} · Gallery: {ev.gallery_visible ? tr("Visible") : tr("Hidden")} · Downloads: {ev.downloads_enabled ? tr("Allowed") : tr("Off")}</li>
        </ul>
      </div>
    </div>
  );
}

type AdminPhoto = { id: string; storage_path: string; thumbnail_path: string | null; file_size: number; uploaded_at: string | null; thumbUrl: string | null };
const PAGE = 30;

function PhotosPanel({ ev }: { ev: EventRecord }) {
  const { t: tr, locale, language } = useLanguage();
  const delPhoto = useServerFn(deletePhoto);
  const qc = useQueryClient();
  const [open, setOpen] = useState<number | null>(null);
  const q = useInfiniteQuery({
    queryKey: ["admin-photos", ev.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from(tr("photos"))
        .select("id,storage_path,thumbnail_path,file_size,uploaded_at")
        .eq("event_id", ev.id)
        .order("uploaded_at", { ascending: false })
        .order(tr("id"), { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (error) throw error;
      const rows = data ?? [];
      const paths = rows.map((r) => r.thumbnail_path ?? r.storage_path);
      const { data: signed } = paths.length ? await supabase.storage.from("event-photos").createSignedUrls(paths, 3600) : { data: [] };
      return rows.map((r, i) => ({ ...r, thumbUrl: signed?.[i]?.signedUrl ?? null })) as AdminPhoto[];
    },
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  });
  const photos = q.data?.pages.flat() ?? [];

  const original = useCallback(
    async (i: number, download = false) => {
      const p = photos[i];
      if (!p) return null;
      const { data } = await supabase.storage.from("event-photos").createSignedUrl(p.storage_path, 600, download ? { download: true } : undefined);
      return data?.signedUrl ?? null;
    },
    [photos],
  );

  if (q.isLoading) return <div className="grid grid-cols-3 gap-2 md:grid-cols-6">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>;
  if (q.error) return <div><p>{tr("Couldn't load photos.")}</p><Button variant="outline" className="mt-3" onClick={() => q.refetch()}>{tr("Retry")}</Button></div>;
  if (!photos.length) return <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">{tr("No photos yet. Share your QR code to start collecting.")}</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{tr("Paket")} {planOf(ev.plan).name}</p>
        {planOf(ev.plan).zipDownload ? <ZipButton eventId={ev.id} slug={ev.slug} /> : <p className="text-xs text-muted-foreground">{tr("Unduh semua (ZIP) tersedia di paket Premium & Exclusive")}</p>}
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative">
            <button onClick={() => setOpen(i)} className="block w-full overflow-hidden rounded-lg bg-muted">
              {p.thumbUrl ? <img src={p.thumbUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : <div className="aspect-square" />}
            </button>
            <button
              aria-label={tr("Delete photo")}
              className="absolute right-1.5 top-1.5 rounded-full bg-card/90 p-1.5 opacity-100 shadow-soft md:opacity-0 md:group-hover:opacity-100"
              onClick={async () => {
                if (!confirm(tr("Delete this photo?"))) return;
                const r = await delPhoto({ data: { id: p.id } });
                if (!r.ok) { toast.error(r.error); return; }
                qc.invalidateQueries({ queryKey: ["admin-photos", ev.id] });
                qc.invalidateQueries({ queryKey: ["my-events"] });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {q.hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage && <Loader2 className="animate-spin" />} {tr("Load more")}
          </Button>
        </div>
      )}
      {open !== null && (
        <Lightbox
          count={photos.length}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          resolveUrl={(i) => original(i)}
          onDownload={async (i) => {
            const u = await original(i, true);
            if (u) window.location.href = u;
          }}
          caption={(i) => `${formatBytes(photos[i]?.file_size ?? 0)} · ${photos[i]?.uploaded_at ? new Date(photos[i]!.uploaded_at!).toLocaleString() : ""}`}
        />
      )}
    </div>
  );
}

function ZipButton({ eventId, slug }: { eventId: string; slug: string }) {
  const { t: tr, locale, language } = useLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  async function run() {
    setBusy(tr("Menyiapkan…"));
    try {
      const rows: { storage_path: string; original_filename: string | null }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from(tr("photos")).select("storage_path,original_filename").eq("event_id", eventId).range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (!rows.length) { toast.error(tr("Belum ada foto")); return; }
      const { zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { data: signed } = await supabase.storage.from("event-photos").createSignedUrls(chunk.map((r) => r.storage_path), 600);
        await Promise.all(chunk.map(async (r, j) => {
          const u = signed?.[j]?.signedUrl;
          if (!u) return;
          const res = await fetch(u);
          if (!res.ok) return;
          const ext = r.storage_path.split(".").pop();
          files[`${String(i + j + 1).padStart(4, "0")}.${ext}`] = new Uint8Array(await res.arrayBuffer());
        }));
        setBusy(`${Math.min(i + 50, rows.length)}/${rows.length}`);
      }
      const blob = new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `velora-${slug}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch {
      toast.error(tr("Gagal membuat ZIP"));
    } finally {
      setBusy(null);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={run} disabled={!!busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />} {busy ?? tr("Unduh semua (ZIP)")}
    </Button>
  );
}
