import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PIN_RE, SLUG_RE } from "./image-validation";

const BUCKET = "event-photos";

const eventInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  slug: z.string().regex(SLUG_RE, "Use 3–60 lowercase letters, numbers or dashes."),
  eventType: z.string().max(40).nullable(),
  eventDate: z.string().max(40).nullable(),
  description: z.string().max(1000).nullable(),
  coverImagePath: z.string().max(300).nullable().optional(),
  privacy: z.enum(["public", "pin"]),
  pin: z.string().optional().nullable(),
  uploadsEnabled: z.boolean(),
  downloadsEnabled: z.boolean(),
  galleryVisible: z.boolean(),
  maxFileSizeMb: z.number().int().min(1).max(25),
  maxPhotos: z.number().int().min(1).max(20000),
  maxUploadsPerGuest: z.number().int().min(1).max(500),
});

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let pinHash: string | undefined;
    if (data.pin) {
      if (!PIN_RE.test(data.pin)) return { ok: false as const, error: "PIN must be 4–8 digits." };
      const { hashPin } = await import("./access.server");
      pinHash = await hashPin(data.pin);
    }
    if (data.coverImagePath && data.id && !data.coverImagePath.startsWith(`${data.id}/cover/`))
      return { ok: false as const, error: "Invalid cover image." };

    const row = {
      title: data.title,
      slug: data.slug,
      event_type: data.eventType,
      event_date: data.eventDate,
      description: data.description,
      privacy: data.privacy,
      uploads_enabled: data.uploadsEnabled,
      downloads_enabled: data.downloadsEnabled,
      gallery_visible: data.galleryVisible,
      max_file_size_mb: data.maxFileSizeMb,
      max_photos: data.maxPhotos,
      max_uploads_per_guest: data.maxUploadsPerGuest,
      ...(data.coverImagePath !== undefined ? { cover_image_path: data.coverImagePath } : {}),
      ...(pinHash ? { access_pin_hash: pinHash } : {}),
      ...(data.privacy === "public" ? { access_pin_hash: null } : {}),
    };

    if (!data.id && data.privacy === "pin" && !pinHash)
      return { ok: false as const, error: "Set a PIN for a protected album." };

    const res = data.id
      ? await supabase.from("events").update(row).eq("id", data.id).eq("owner_id", userId).select("id,slug").maybeSingle()
      : await supabase.from("events").insert({ ...row, owner_id: userId }).select("id,slug").maybeSingle();

    if (res.error) {
      if (res.error.code === "23505") return { ok: false as const, error: "That link is already taken. Try another." };
      if (res.error.code === "23514") return { ok: false as const, error: "Set a PIN for a protected album." };
      console.error(res.error);
      return { ok: false as const, error: "Could not save the event." };
    }
    if (!res.data) return { ok: false as const, error: "Event not found." };
    return { ok: true as const, id: res.data.id, slug: res.data.slug };
  });

async function removeFolder(supabase: any, prefix: string) {
  for (;;) {
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
    const files = (data ?? []).filter((f: { id: string | null }) => f.id).map((f: { name: string }) => `${prefix}/${f.name}`);
    if (!files.length) break;
    await supabase.storage.from(BUCKET).remove(files);
    if (files.length < 1000) break;
  }
}

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev } = await supabase.from("events").select("id").eq("id", data.id).eq("owner_id", userId).maybeSingle();
    if (!ev) return { ok: false as const, error: "Event not found." };
    for (const sub of ["originals", "thumbs", "cover"]) await removeFolder(supabase, `${ev.id}/${sub}`);
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    if (error) return { ok: false as const, error: "Could not delete the event." };
    return { ok: true as const };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: p } = await supabase.from("photos").select("id,storage_path,thumbnail_path").eq("id", data.id).maybeSingle();
    if (!p) return { ok: false as const, error: "Photo not found." };
    await supabase.storage.from(BUCKET).remove([p.storage_path, ...(p.thumbnail_path ? [p.thumbnail_path] : [])]);
    const { error } = await supabase.from("photos").delete().eq("id", p.id);
    if (error) return { ok: false as const, error: "Could not delete photo." };
    return { ok: true as const };
  });
