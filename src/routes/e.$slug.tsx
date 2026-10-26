import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, Check, Loader2, Lock, RotateCw, X, ImageOff, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { getPublicEvent, getPhotoUrl, listPublicPhotos, unlockEvent, type PublicPhoto } from "@/lib/public-event.functions";
import { ALLOWED_MIME } from "@/lib/image-validation";
import { Wordmark } from "@/components/Logo";
import { Lightbox } from "@/components/Lightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/e/$slug")({
  loader: async ({ params }) => {
    const ev = await getPublicEvent({ data: { slug: params.slug, token: null } });
    return { title: ev?.title ?? null };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.title ? `${loaderData.title} — Share your photos` : "Event album — VELORA";
    const d = loaderData?.title ? `Add your photos to ${loaderData.title}'s shared album. No app needed.` : "Shared event album on VELORA.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: GuestPage,
});

const tokenKey = (slug: string) => `velora_token_${slug}`;

function GuestPage() {
  const { t: tr, locale, language } = useLanguage();
  const { slug } = Route.useParams();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setToken(localStorage.getItem(tokenKey(slug)));
    setReady(true);
  }, [slug]);

  const evQ = useQuery({
    queryKey: ["public-event", slug, token],
    queryFn: () => getPublicEvent({ data: { slug, token } }),
    enabled: ready,
  });
  const ev = evQ.data;

  if (!ready || evQ.isLoading) {
    return <Shell><Skeleton className="h-48 rounded-2xl" /><Skeleton className="mt-4 h-14 rounded-full" /></Shell>;
  }
  if (evQ.error) {
    return <Shell><p className="text-center">{tr("We couldn't load this event.")}</p><div className="mt-4 text-center"><Button variant="outline" onClick={() => evQ.refetch()}>{tr("Try again")}</Button></div></Shell>;
  }
  if (!ev) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-4xl">{tr("Event not found")}</h1>
          <p className="mt-2 text-muted-foreground">{tr("Check the link or QR code and try again.")}</p>
        </div>
      </Shell>
    );
  }

  const header = (
    <header className="text-center">
      {ev.coverUrl && (
        <img src={ev.coverUrl} alt="" className="mb-6 aspect-[16/10] w-full rounded-2xl object-cover shadow-soft" />
      )}
      <p className="eyebrow">{tr(ev.eventType ?? "Event")}</p>
      <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{ev.title}</h1>
      {ev.eventDate && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date(ev.eventDate).toLocaleDateString(locale, { dateStyle: "long" })}
        </p>
      )}
      {ev.description && <p className="mx-auto mt-3 max-w-md text-muted-foreground">{ev.description}</p>}
    </header>
  );

  if (!ev.unlocked) {
    return (
      <Shell hideBranding={ev.hideBranding}>
        {header}
        <PinForm
          slug={slug}
          onUnlocked={(t) => {
            localStorage.setItem(tokenKey(slug), t);
            setToken(t);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell hideBranding={ev.hideBranding}>
      {header}
      {ev.expired && <p className="mt-8 rounded-xl border border-border bg-card p-4 text-center text-sm">{tr("Album ini sudah berakhir dan tidak menerima foto baru lagi.")}</p>}
      {!ev.expired && <Uploader slug={slug} token={token} enabled={ev.uploadsEnabled} maxMb={ev.maxFileSizeMb} />}
      {ev.galleryVisible ? (
        <Gallery slug={slug} token={token} downloads={ev.downloadsEnabled} initialCount={ev.photoCount} />
      ) : (
        <p className="mt-10 text-center text-sm text-muted-foreground">{tr("The organiser is keeping the gallery private. Your photos go straight to them.")}</p>
      )}
    </Shell>
  );
}

function Shell({ children, hideBranding = false }: { children: React.ReactNode; hideBranding?: boolean }) {
  const { t: tr, locale, language } = useLanguage();
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <div className="mb-4 flex justify-end"><LanguageSelector /></div>
        {!hideBranding && <div className="mb-8 flex justify-center"><Wordmark /></div>}
        {children}
        <p className="mt-16 text-center text-xs text-muted-foreground">
          {!hideBranding && <>{tr("Powered by")} <Link to="/" className="underline underline-offset-2">VELORA</Link> · </>}<Link to="/privacy" className="underline underline-offset-2">{tr("Privacy")}</Link>
        </p>
      </div>
    </div>
  );
}

function PinForm({ slug, onUnlocked }: { slug: string; onUnlocked: (t: string) => void }) {
  const { t: tr, locale, language } = useLanguage();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await unlockEvent({ data: { slug, pin } });
      if (r.ok) onUnlocked(r.token);
      else setErr(r.error);
    } catch {
      setErr(tr("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-xs rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
      <Lock className="mx-auto h-5 w-5 text-gold" />
      <p className="mt-3 font-medium">{tr("This album is protected")}</p>
      <p className="text-sm text-muted-foreground">{tr("Enter the PIN from your host.")}</p>
      <Input
        className="mt-4 text-center text-lg tracking-[0.4em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={tr("Event PIN")}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
      />
      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      <Button className="mt-4 w-full" disabled={busy || pin.length < 4}>
        {busy && <Loader2 className="animate-spin" />} {tr("Unlock")}
      </Button>
    </form>
  );
}

// ---------- Uploads ----------

type Item = {
  key: string;
  file: File;
  preview: string;
  status: "queued" | "preparing" | "uploading" | "done" | "error";
  progress: number;
  error?: string | undefined;
  retry?: boolean | undefined;
};

const CONCURRENCY = 2;

function Uploader({ slug, token, enabled, maxMb }: { slug: string; token: string | null; enabled: boolean; maxMb: number }) {
  const { t: tr, locale, language } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const running = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const seen = useRef(new Set<string>());

  const patch = useCallback((key: string, p: Partial<Item>) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }, []);

  const uploadOne = useCallback(
    async (item: Item) => {
      patch(item.key, { status: "preparing", progress: 0, error: undefined });
      try {
        const { prepareImage, guestId } = await import("@/lib/image-client");
        let prepared;
        try {
          prepared = await prepareImage(item.file);
        } catch {
          prepared = { file: item.file, thumb: null, width: 0, height: 0, name: item.file.name };
        }
        if (prepared.file.size > maxMb * 1024 * 1024) throw Object.assign(new Error(language === "en" ? `Photos must be under ${maxMb} MB.` : `Ukuran foto harus di bawah ${maxMb} MB.`), { retry: false });
        const fd = new FormData();
        fd.append("slug", slug);
        if (token) fd.append("token", token);
        fd.append("guestId", guestId());
        fd.append("width", String(prepared.width));
        fd.append("height", String(prepared.height));
        fd.append("file", prepared.file, prepared.name);
        if (prepared.thumb) fd.append("thumb", prepared.thumb, "thumb");
        patch(item.key, { status: "uploading" });
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/public/upload");
          xhr.timeout = 120_000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) patch(item.key, { progress: Math.round((e.loaded / e.total) * 100) });
          };
          xhr.onload = () => {
            let body: { ok?: boolean; error?: string; retry?: boolean } = {};
            try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
            if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve();
            else reject(Object.assign(new Error(body.error ?? tr("Upload failed.")), { retry: body.retry ?? xhr.status >= 500 }));
          };
          xhr.onerror = () => reject(Object.assign(new Error(tr("Connection lost.")), { retry: true }));
          xhr.ontimeout = () => reject(Object.assign(new Error(tr("Upload timed out.")), { retry: true }));
          xhr.send(fd);
        });
        patch(item.key, { status: "done", progress: 100 });
        window.dispatchEvent(new CustomEvent("velora:uploaded", { detail: { preview: item.preview, key: item.key } }));
      } catch (e) {
        const err = e as Error & { retry?: boolean };
        patch(item.key, { status: "error", error: err.message, retry: err.retry !== false });
      }
    },
    [slug, token, maxMb, patch],
  );

  const pump = useCallback(() => {
    while (running.current < CONCURRENCY) {
      const next = itemsRef.current.find((i) => i.status === "queued");
      if (!next) return;
      running.current++;
      next.status = "preparing"; // claim synchronously to avoid double-start
      uploadOne(next).finally(() => {
        running.current--;
        pump();
      });
    }
  }, [uploadOne]);

  useEffect(() => {
    if (items.some((i) => i.status === "queued")) pump();
  }, [items, pump]);

  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  function onFiles(list: FileList | null) {
    if (!list) return;
    const added: Item[] = [];
    let rejected = 0;
    for (const f of Array.from(list)) {
      const sig = `${f.name}:${f.size}:${f.lastModified}`;
      if (seen.current.has(sig)) continue; // prevent duplicate submissions
      if (!(ALLOWED_MIME as readonly string[]).includes(f.type)) { rejected++; continue; }
      seen.current.add(sig);
      added.push({ key: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f), status: "queued", progress: 0 });
    }
    if (rejected) toast.error(language === "en" ? `${rejected} file(s) skipped — only JPEG, PNG and WebP are supported.` : `${rejected} file dilewati — hanya JPEG, PNG, dan WebP yang didukung.`);
    if (added.length) setItems((l) => [...added, ...l]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const done = items.filter((i) => i.status === "done").length;
  const active = items.filter((i) => i.status === "queued" || i.status === "preparing" || i.status === "uploading").length;

  if (!enabled) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-medium">{tr("Uploads are closed")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tr("The host is no longer collecting new photos for this event.")}</p>
      </div>
    );
  }

  return (
    <section className="mt-8">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" id="photo-input" onChange={(e) => onFiles(e.target.files)} />
      <Button size="lg" className="h-14 w-full text-base" onClick={() => inputRef.current?.click()}>
        <Camera className="!size-5" /> {tr("Upload Photos")}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{language === "en" ? `JPEG, PNG or WebP · up to ${maxMb} MB each` : `JPEG, PNG, atau WebP · hingga ${maxMb} MB per foto`}</p>

      {items.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm">
            {active > 0 ? language === "en" ? `Uploading… ${done} of ${items.length} done` : `Mengunggah… ${done} dari ${items.length} selesai` : language === "en" ? `${done} of ${items.length} uploaded` : `${done} dari ${items.length} diunggah`}
          </p>
          <ul className="mt-3 space-y-2">
            {items.map((i) => (
              <UploadRow key={i.key} item={i} onRetry={() => patch(i.key, { status: "queued", progress: 0, error: undefined })} onRemove={() => setItems((l) => l.filter((x) => x.key !== i.key))} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const UploadRow = memo(function UploadRow({ item, onRetry, onRemove }: { item: Item; onRetry: () => void; onRemove: () => void }) {
  const { t: tr, locale, language } = useLanguage();
  return (
    <li className="flex items-center gap-3">
      <img src={item.preview} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.file.name}</p>
        {item.status === "error" ? (
          <p className="text-xs text-destructive">{item.error}</p>
        ) : (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-gold transition-[width]" style={{ width: `${item.status === "done" ? 100 : item.progress}%` }} />
          </div>
        )}
      </div>
      {item.status === "done" && <Check className="h-5 w-5 text-success" aria-label={tr("Uploaded")} />}
      {(item.status === "uploading" || item.status === "preparing") && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {item.status === "error" && (
        <div className="flex">
          {item.retry && <Button size="icon" variant="ghost" onClick={onRetry} aria-label={tr("Retry upload")}><RotateCw /></Button>}
          <Button size="icon" variant="ghost" onClick={onRemove} aria-label={tr("Remove")}><X /></Button>
        </div>
      )}
    </li>
  );
});

// ---------- Gallery ----------

function Gallery({ slug, token, downloads, initialCount }: { slug: string; token: string | null; downloads: boolean; initialCount: number }) {
  const { t: tr, locale, language } = useLanguage();
  const [fresh, setFresh] = useState<{ key: string; preview: string }[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; preview: string }>).detail;
      setFresh((f) => [d, ...f]);
    };
    window.addEventListener("velora:uploaded", h);
    return () => window.removeEventListener("velora:uploaded", h);
  }, []);

  const q = useInfiniteQuery({
    queryKey: ["public-photos", slug, token],
    initialPageParam: null as { at: string; id: string } | null,
    queryFn: ({ pageParam }) => listPublicPhotos({ data: { slug, token, cursor: pageParam } }),
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: 5 * 60 * 1000,
  });
  const photos = useMemo(() => q.data?.pages.flatMap((p) => p.photos) ?? [], [q.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resolve = useCallback(async (i: number) => {
    const p = photos[i];
    if (!p) return null;
    return (await getPhotoUrl({ data: { slug, token, photoId: p.id } })).url;
  }, [photos, slug, token]);

  const download = useCallback(async (i: number) => {
    const p = photos[i];
    if (!p) return;
    const { url } = await getPhotoUrl({ data: { slug, token, photoId: p.id, download: true } });
    if (url) window.location.href = url;
    else toast.error(tr("Download isn't available"));
  }, [photos, slug, token]);

  const count = initialCount + fresh.length;

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl">{tr("Gallery")}</h2>
        <span className="text-sm text-muted-foreground">{count} {count === 1 ? tr("photo") : tr("photos")}</span>
      </div>
      {fresh.length > 0 && (
        <div className="mt-4">
          <p className="eyebrow">{tr("Just added by you")}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {fresh.map((f) => <img key={f.key} src={f.preview} alt="" className="aspect-square w-full rounded-md object-cover" />)}
          </div>
        </div>
      )}
      {q.isLoading && <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>}
      {q.error && <div className="mt-4 text-center"><p className="text-sm">{tr("Couldn't load the gallery.")}</p><Button variant="outline" className="mt-2" onClick={() => q.refetch()}>{tr("Retry")}</Button></div>}
      {!q.isLoading && !q.error && photos.length === 0 && fresh.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">{tr("No photos yet — be the first to share one.")}</p>
      )}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((p, i) => <Tile key={p.id} photo={p} index={i} onOpen={setOpen} />)}
        </div>
      )}
      <div ref={sentinel} className="h-px" />
      {isFetchingNextPage && <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {open !== null && (
        <Lightbox
          count={photos.length}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          resolveUrl={resolve}
          onDownload={downloads ? download : undefined}
          caption={(i) => (photos[i]?.uploadedAt ? new Date(photos[i]?.uploadedAt ?? "").toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "")}
        />
      )}
    </section>
  );
}

const Tile = memo(function Tile({ photo, index, onOpen }: { photo: PublicPhoto; index: number; onOpen: (i: number) => void }) {
  const { t: tr, locale, language } = useLanguage();
  const [failed, setFailed] = useState(false);
  return (
    <button onClick={() => onOpen(index)} className="block overflow-hidden rounded-md bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${language === "en" ? "Open photo" : "Buka foto"} ${index + 1}`}>
      {photo.thumbUrl && !failed ? (
        <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" width={240} height={240} onError={() => setFailed(true)} className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square items-center justify-center text-muted-foreground"><ImageOff className="h-4 w-4" /></div>
      )}
    </button>
  );
});
