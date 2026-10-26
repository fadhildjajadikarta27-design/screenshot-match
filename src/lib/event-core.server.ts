// Server-only shared helpers for public event access and uploads.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  HARD_MAX_FILE_MB,
  MAX_THUMB_BYTES,
  SLUG_RE,
  extForMime,
  sanitizeFilename,
  sniffImageType,
} from "./image-validation";
import { isExpired } from "./plans";
import { checkAccessToken, clientHash } from "./access.server";

export const BUCKET = "event-photos";

export type EventRow = {
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
  plan: string;
  expires_at: string | null;
};

export function db() {
  return supabaseAdmin;
}

export async function loadEvent(slug: string): Promise<EventRow | null> {
  if (!SLUG_RE.test(slug)) return null;
  const { data } = await supabaseAdmin
    .from("events")
    .select(
      "id,title,slug,event_type,event_date,description,cover_image_path,privacy,access_pin_hash,uploads_enabled,downloads_enabled,gallery_visible,max_file_size_mb,max_photos,max_uploads_per_guest,plan,expires_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function hasAccess(ev: EventRow, token?: string | null) {
  if (ev.privacy === "public") return true;
  return checkAccessToken(ev.id, ev.access_pin_hash, token);
}

export function clientIpFrom(get: (name: string) => string | null | undefined) {
  return get("cf-connecting-ip") || get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type UploadResult = { ok: true; id: string } | { ok: false; error: string; retry: boolean; status: number };

export async function processUpload(form: FormData, ip: string, ua: string): Promise<UploadResult> {
  const fail = (error: string, status = 400, retry = false): UploadResult => ({ ok: false, error, retry, status });
  const slug = String(form.get("slug") ?? "");
  const token = form.get("token") ? String(form.get("token")) : null;
  const guestId = String(form.get("guestId") ?? "").slice(0, 64);
  const file = form.get("file");
  const thumb = form.get("thumb");
  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;

  const ev = await loadEvent(slug);
  if (!ev) return fail("This event no longer exists.", 404);
  if (isExpired(ev.expires_at)) return fail("This album has ended and no longer accepts photos.", 403);
  if (!ev.uploads_enabled) return fail("Uploads are closed for this event.", 403);
  if (!(await hasAccess(ev, token))) return fail("Enter the event PIN to upload.", 401);
  if (!(file instanceof File)) return fail("No file received.");

  const maxBytes = Math.min(ev.max_file_size_mb, HARD_MAX_FILE_MB) * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) return fail(`Photos must be under ${ev.max_file_size_mb} MB.`, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) return fail("Only JPEG, PNG and WebP photos are supported.", 415);

  let thumbBytes: Uint8Array | null = null;
  let thumbMime: ReturnType<typeof sniffImageType> = null;
  if (thumb instanceof File && thumb.size > 0 && thumb.size <= MAX_THUMB_BYTES) {
    thumbBytes = new Uint8Array(await thumb.arrayBuffer());
    thumbMime = sniffImageType(thumbBytes);
    if (!thumbMime) thumbBytes = null;
  }

  const ipHash = await clientHash(ip, "ip", "ip");
  const uploaderHash = await clientHash(ip, ua, guestId);
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };

  // Rate limits: per network (shared venue Wi-Fi friendly) and per device.
  const [net, dev, total, mine] = await Promise.all([
    supabaseAdmin.from("upload_attempts").select("id", head).eq("client_hash", `ip:${ipHash}`).gte("created_at", since),
    supabaseAdmin.from("upload_attempts").select("id", head).eq("client_hash", `dev:${uploaderHash}`).gte("created_at", since),
    supabaseAdmin.from("photos").select("id", head).eq("event_id", ev.id),
    supabaseAdmin.from("photos").select("id", head).eq("event_id", ev.id).eq("uploader_hash", uploaderHash),
  ]);
  if ((net.count ?? 0) >= 300 || (dev.count ?? 0) >= 60)
    return fail("Too many uploads at once. Please wait a few minutes and retry.", 429, true);
  if ((total.count ?? 0) >= ev.max_photos) return fail("This album is full.", 403);
  if ((mine.count ?? 0) >= ev.max_uploads_per_guest)
    return fail(`You've reached the limit of ${ev.max_uploads_per_guest} photos for this event.`, 403);

  await supabaseAdmin.from("upload_attempts").insert([
    { event_id: ev.id, client_hash: `ip:${ipHash}` },
    { event_id: ev.id, client_hash: `dev:${uploaderHash}` },
  ]);

  const id = crypto.randomUUID();
  const path = `${ev.id}/originals/${id}.${extForMime(mime)}`;
  const up = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, cacheControl: "31536000", upsert: false });
  if (up.error) {
    console.error("storage upload failed", up.error);
    return fail("Upload failed. Please retry.", 500, true);
  }

  let thumbPath: string | null = null;
  if (thumbBytes && thumbMime) {
    const tp = `${ev.id}/thumbs/${id}.${extForMime(thumbMime)}`;
    const t = await supabaseAdmin.storage.from(BUCKET).upload(tp, thumbBytes, { contentType: thumbMime, cacheControl: "31536000" });
    if (!t.error) thumbPath = tp;
  }

  const dim = (n: number | null) => (n && n > 0 && n < 30000 ? Math.round(n) : null);
  const { error } = await supabaseAdmin.from("photos").insert({
    id,
    event_id: ev.id,
    storage_path: path,
    thumbnail_path: thumbPath,
    original_filename: sanitizeFilename(file.name),
    file_size: bytes.byteLength,
    mime_type: mime,
    width: dim(width),
    height: dim(height),
    uploader_hash: uploaderHash,
  });
  if (error) {
    console.error("photo insert failed", error);
    await supabaseAdmin.storage.from(BUCKET).remove([path, ...(thumbPath ? [thumbPath] : [])]);
    return fail("Upload failed. Please retry.", 500, true);
  }
  return { ok: true, id };
}
