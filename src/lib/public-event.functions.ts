import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  HARD_MAX_FILE_MB,
  MAX_THUMB_BYTES,
  PIN_RE,
  SLUG_RE,
  extForMime,
  sanitizeFilename,
  sniffImageType,
} from "./image-validation";

const BUCKET = "event-photos";
const PAGE_SIZE = 24;
const SIGNED_TTL = 60 * 60; // 1h

type EventRow = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  event_date: string | null;
  description: string | null;
  cover_image_path: string | null;
  privacy: string;
  access_pin_hash: string | null;
  uploads_enabled: boolean;
  downloads_enabled: boolean;
  gallery_visible: boolean;
  max_file_size_mb: number;
  max_photos: number;
  max_uploads_per_guest: number;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadEvent(slug: string): Promise<EventRow | null> {
  if (!SLUG_RE.test(slug)) return null;
  const db = await admin();
  const { data } = await db
    .from("events")
    .select(
      "id,title,slug,event_type,event_date,description,cover_image_path,privacy,access_pin_hash,uploads_enabled,downloads_enabled,gallery_visible,max_file_size_mb,max_photos,max_uploads_per_guest",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as EventRow | null) ?? null;
}

async function hasAccess(ev: EventRow, token?: string | null) {
  if (ev.privacy === "public") return true;
  const { checkAccessToken } = await import("./access.server");
  return checkAccessToken(ev.id, ev.access_pin_hash, token);
}

function clientIp() {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

const slugToken = z.object({
  slug: z.string().min(3).max(60),
  token: z.string().max(200).nullish(),
});

export type PublicEvent = {
  title: string;
  slug: string;
  eventType: string | null;
  eventDate: string | null;
  description: string | null;
  coverUrl: string | null;
  isProtected: boolean;
  unlocked: boolean;
  uploadsEnabled: boolean;
  downloadsEnabled: boolean;
  galleryVisible: boolean;
  maxFileSizeMb: number;
  photoCount: number;
};

export const getPublicEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => slugToken.parse(d))
  .handler(async ({ data }): Promise<PublicEvent | null> => {
    const ev = await loadEvent(data.slug);
    if (!ev) return null;
    const unlocked = await hasAccess(ev, data.token);
    const db = await admin();
    let coverUrl: string | null = null;
    let photoCount = 0;
    if (unlocked) {
      if (ev.cover_image_path) {
        const { data: s } = await db.storage.from(BUCKET).createSignedUrl(ev.cover_image_path, SIGNED_TTL);
        coverUrl = s?.signedUrl ?? null;
      }
      const { count } = await db
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.id);
      photoCount = count ?? 0;
    }
    return {
      title: ev.title,
      slug: ev.slug,
      eventType: ev.event_type,
      eventDate: ev.event_date,
      description: unlocked ? ev.description : null,
      coverUrl,
      isProtected: ev.privacy === "pin",
      unlocked,
      uploadsEnabled: ev.uploads_enabled,
      downloadsEnabled: ev.downloads_enabled,
      galleryVisible: ev.gallery_visible,
      maxFileSizeMb: ev.max_file_size_mb,
      photoCount,
    };
  });

export const unlockEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(3).max(60), pin: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const ev = await loadEvent(data.slug);
    if (!ev || ev.privacy !== "pin") return { ok: false as const, error: "Event not found." };
    const db = await admin();
    const { clientHash, verifyPin, issueAccessToken } = await import("./access.server");
    const ipHash = await clientHash(clientIp(), "pin", "pin");
    // Brute-force protection: max 10 PIN attempts / 15 min per IP per event.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await db
      .from("upload_attempts")
      .select("id", { count: "exact", head: true })
      .eq("client_hash", `pin:${ipHash}`)
      .eq("event_id", ev.id)
      .gte("created_at", since);
    if ((count ?? 0) >= 10) return { ok: false as const, error: "Too many attempts. Try again in a few minutes." };
    if (!PIN_RE.test(data.pin) || !(await verifyPin(data.pin, ev.access_pin_hash))) {
      await db.from("upload_attempts").insert({ event_id: ev.id, client_hash: `pin:${ipHash}` });
      return { ok: false as const, error: "Incorrect PIN." };
    }
    return { ok: true as const, token: await issueAccessToken(ev.id, ev.access_pin_hash!) };
  });

export type PublicPhoto = {
  id: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  uploadedAt: string;
};

export const listPublicPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    slugToken.extend({ cursor: z.object({ at: z.string(), id: z.string().uuid() }).nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await loadEvent(data.slug);
    if (!ev) return { photos: [] as PublicPhoto[], next: null, error: "Event not found." };
    if (!(await hasAccess(ev, data.token))) return { photos: [], next: null, error: "locked" };
    if (!ev.gallery_visible) return { photos: [], next: null, error: "hidden" };
    const db = await admin();
    let q = db
      .from("photos")
      .select("id,thumbnail_path,storage_path,width,height,uploaded_at")
      .eq("event_id", ev.id)
      .order("uploaded_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);
    if (data.cursor) {
      q = q.or(
        `uploaded_at.lt.${data.cursor.at},and(uploaded_at.eq.${data.cursor.at},id.lt.${data.cursor.id})`,
      );
    }
    const { data: rows, error } = await q;
    if (error) return { photos: [], next: null, error: "Could not load photos." };
    const page = (rows ?? []).slice(0, PAGE_SIZE);
    const paths = page.map((r) => r.thumbnail_path ?? r.storage_path);
    const { data: signed } = paths.length
      ? await db.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
      : { data: [] };
    const photos: PublicPhoto[] = page.map((r, i) => ({
      id: r.id,
      thumbUrl: signed?.[i]?.signedUrl ?? null,
      width: r.width,
      height: r.height,
      uploadedAt: r.uploaded_at ?? "",
    }));
    const last = page[page.length - 1];
    const next = rows && rows.length > PAGE_SIZE && last ? { at: last.uploaded_at!, id: last.id } : null;
    return { photos, next, error: null };
  });

export const getPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    slugToken.extend({ photoId: z.string().uuid(), download: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await loadEvent(data.slug);
    if (!ev || !(await hasAccess(ev, data.token)) || !ev.gallery_visible) return { url: null };
    if (data.download && !ev.downloads_enabled) return { url: null };
    const db = await admin();
    // Event-scoped lookup prevents cross-event access via a guessed photo id.
    const { data: p } = await db
      .from("photos")
      .select("storage_path")
      .eq("id", data.photoId)
      .eq("event_id", ev.id)
      .maybeSingle();
    if (!p) return { url: null };
    const { data: s } = await db.storage
      .from(BUCKET)
      .createSignedUrl(p.storage_path, 10 * 60, data.download ? { download: `velora-${data.photoId.slice(0, 8)}` } : undefined);
    return { url: s?.signedUrl ?? null };
  });

export const uploadPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Invalid upload");
    return d;
  })
  .handler(async ({ data: form }) => {
    const fail = (error: string, retry = false) => ({ ok: false as const, error, retry });
    const slug = String(form.get("slug") ?? "");
    const token = form.get("token") ? String(form.get("token")) : null;
    const guestId = String(form.get("guestId") ?? "").slice(0, 64);
    const file = form.get("file");
    const thumb = form.get("thumb");
    const width = Number(form.get("width")) || null;
    const height = Number(form.get("height")) || null;

    const ev = await loadEvent(slug);
    if (!ev) return fail("This event no longer exists.");
    if (!ev.uploads_enabled) return fail("Uploads are closed for this event.");
    if (!(await hasAccess(ev, token))) return fail("Enter the event PIN to upload.");
    if (!(file instanceof File)) return fail("No file received.");

    const maxBytes = Math.min(ev.max_file_size_mb, HARD_MAX_FILE_MB) * 1024 * 1024;
    if (file.size <= 0 || file.size > maxBytes) return fail(`Photos must be under ${ev.max_file_size_mb} MB.`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImageType(bytes);
    if (!mime) return fail("Only JPEG, PNG and WebP photos are supported.");

    let thumbBytes: Uint8Array | null = null;
    let thumbMime: ReturnType<typeof sniffImageType> = null;
    if (thumb instanceof File && thumb.size > 0 && thumb.size <= MAX_THUMB_BYTES) {
      thumbBytes = new Uint8Array(await thumb.arrayBuffer());
      thumbMime = sniffImageType(thumbBytes);
      if (!thumbMime) thumbBytes = null;
    }

    const db = await admin();
    const { clientHash } = await import("./access.server");
    const ip = clientIp();
    const ipHash = await clientHash(ip, "ip", "ip");
    const uploaderHash = await clientHash(ip, getRequestHeader("user-agent") ?? "", guestId);
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Rate limits: per network (shared venue Wi-Fi friendly) and per device.
    const [{ count: netCount }, { count: devCount }, { count: total }, { count: mine }] = await Promise.all([
      db.from("upload_attempts").select("id", { count: "exact", head: true }).eq("client_hash", `ip:${ipHash}`).gte("created_at", since),
      db.from("upload_attempts").select("id", { count: "exact", head: true }).eq("client_hash", `dev:${uploaderHash}`).gte("created_at", since),
      db.from("photos").select("id", { count: "exact", head: true }).eq("event_id", ev.id),
      db.from("photos").select("id", { count: "exact", head: true }).eq("event_id", ev.id).eq("uploader_hash", uploaderHash),
    ]);
    if ((netCount ?? 0) >= 300 || (devCount ?? 0) >= 60)
      return fail("Too many uploads at once. Please wait a few minutes and retry.", true);
    if ((total ?? 0) >= ev.max_photos) return fail("This album is full.");
    if ((mine ?? 0) >= ev.max_uploads_per_guest)
      return fail(`You've reached the limit of ${ev.max_uploads_per_guest} photos for this event.`);

    await db.from("upload_attempts").insert([
      { event_id: ev.id, client_hash: `ip:${ipHash}` },
      { event_id: ev.id, client_hash: `dev:${uploaderHash}` },
    ]);

    const id = crypto.randomUUID();
    const path = `${ev.id}/originals/${id}.${extForMime(mime)}`;
    const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mime, cacheControl: "31536000", upsert: false });
    if (up.error) return fail("Upload failed. Please retry.", true);

    let thumbPath: string | null = null;
    if (thumbBytes && thumbMime) {
      const tp = `${ev.id}/thumbs/${id}.${extForMime(thumbMime)}`;
      const t = await db.storage.from(BUCKET).upload(tp, thumbBytes, { contentType: thumbMime, cacheControl: "31536000" });
      if (!t.error) thumbPath = tp;
    }

    const { error } = await db.from("photos").insert({
      id,
      event_id: ev.id,
      storage_path: path,
      thumbnail_path: thumbPath,
      original_filename: sanitizeFilename(file.name),
      file_size: bytes.byteLength,
      mime_type: mime,
      width: width && width > 0 && width < 30000 ? Math.round(width) : null,
      height: height && height > 0 && height < 30000 ? Math.round(height) : null,
      uploader_hash: uploaderHash,
    });
    if (error) {
      await db.storage.from(BUCKET).remove([path, ...(thumbPath ? [thumbPath] : [])]);
      return fail("Upload failed. Please retry.", true);
    }
    return { ok: true as const, id };
  });
