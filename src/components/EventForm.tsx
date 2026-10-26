import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveEvent } from "@/lib/admin.functions";
import { PIN_RE, SLUG_RE, slugify } from "@/lib/image-validation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { EVENT_TYPES, type EventRecord } from "./AdminShell";
import { EVENT_TYPE_LABELS, PLAN_IDS, PLAN_TIERS, blurbFor, formatRupiah, isPlanId, priceFor, type PlanId } from "@/lib/plans";

type Props = { initial?: EventRecord; onSaved: (r: { id: string; slug: string }) => void };

function toLocalDate(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

export function EventForm({ initial, onSaved }: Props) {
  const save = useServerFn(saveEvent);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [eventType, setEventType] = useState(initial?.event_type ?? "Wedding");
  const [eventDate, setEventDate] = useState(toLocalDate(initial?.event_date));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [privacy, setPrivacy] = useState<"public" | "pin">((initial?.privacy as "public" | "pin") ?? "public");
  const [pin, setPin] = useState("");
  const [uploadsEnabled, setUploads] = useState(initial?.uploads_enabled ?? true);
  const [downloadsEnabled, setDownloads] = useState(initial?.downloads_enabled ?? true);
  const [galleryVisible, setGallery] = useState(initial?.gallery_visible ?? true);
  const [maxFileSizeMb, setMaxFile] = useState(initial?.max_file_size_mb ?? 15);
  const [plan, setPlan] = useState<PlanId>(isPlanId(initial?.plan) ? initial.plan : "free");
  const maxPhotos = PLAN_TIERS[plan].maxPhotos;
  const [maxUploadsPerGuest, setMaxGuest] = useState(initial?.max_uploads_per_guest ?? 50);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const needsPin = privacy === "pin" && (!initial || initial.privacy !== "pin");

  async function uploadCover(eventId: string): Promise<string | null> {
    if (!cover) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(cover.type) || cover.size > 8 * 1024 * 1024) {
      toast.error("Cover must be a JPEG, PNG or WebP under 8 MB");
      return null;
    }
    const path = `${eventId}/cover/${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("event-photos").upload(path, cover, { contentType: cover.type });
    if (error) {
      toast.error("Cover upload failed");
      return null;
    }
    return path;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!SLUG_RE.test(slug)) { toast.error("Link must be 3–60 lowercase letters, numbers or dashes."); return; }
    if ((needsPin || pin) && !PIN_RE.test(pin)) { toast.error("PIN must be 4–8 digits."); return; }
    setBusy(true);
    const base = {
      title,
      slug,
      eventType,
      eventDate: eventDate ? new Date(eventDate + "T12:00:00Z").toISOString() : null,
      description: description || null,
      privacy,
      pin: pin || null,
      uploadsEnabled,
      downloadsEnabled,
      galleryVisible,
      maxFileSizeMb,
      maxPhotos,
      maxUploadsPerGuest,
      plan,
    };
    try {
      let res = await save({ data: { ...base, id: initial?.id } });
      if (!res.ok) throw new Error(res.error);
      if (cover) {
        const path = await uploadCover(res.id);
        if (path) {
          res = await save({ data: { ...base, pin: null, id: res.id, coverImagePath: path } });
          if (!res.ok) throw new Error(res.error);
        }
      }
      toast.success(initial ? "Event saved" : "Event created");
      onSaved({ id: res.id, slug: res.slug });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Details</h2>
        <div className="space-y-1.5">
          <Label htmlFor="title">Event title</Label>
          <Input id="title" required maxLength={120} value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="Ayu & Bima" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Event link</Label>
          <div className="flex items-center rounded-md border border-input bg-background pl-3 text-sm focus-within:ring-1 focus-within:ring-ring">
            <span className="text-muted-foreground">/e/</span>
            <input id="slug" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} className="h-11 flex-1 bg-transparent px-1 outline-none" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="type">Category</Label>
            <select id="type" value={eventType ?? ""} onChange={(e) => setEventType(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description (optional)</Label>
          <Textarea id="desc" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover">Cover image (optional)</Label>
          <Input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-2xl">Paket</h2>
          <p className="text-sm text-muted-foreground">Harga untuk {EVENT_TYPE_LABELS[eventType ?? "Other"] ?? "acara ini"}. Pembayaran segera hadir.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const t = PLAN_TIERS[id];
            return (
              <label key={id} className={`cursor-pointer rounded-xl border p-4 ${plan === id ? "border-gold bg-accent/50" : "border-border"}`}>
                <input type="radio" name="plan" className="sr-only" checked={plan === id} onChange={() => setPlan(id)} />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{t.name}</p>
                  <p className="font-display text-lg">{formatRupiah(priceFor(eventType, id))}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{blurbFor(eventType, id)}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {id === "exclusive" ? "Foto tanpa batas" : `${t.maxPhotos.toLocaleString("id-ID")} foto`} · aktif {t.activeDays >= 365 ? "1 tahun" : t.activeDays >= 180 ? "6 bulan" : `${t.activeDays} hari`}
                  {t.zipDownload ? " · unduh ZIP" : ""}{t.hideBranding ? " · tanpa logo" : ""}
                </p>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Access</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["public", "pin"] as const).map((p) => (
            <label key={p} className={`cursor-pointer rounded-xl border p-4 ${privacy === p ? "border-gold bg-accent/50" : "border-border"}`}>
              <input type="radio" name="privacy" className="sr-only" checked={privacy === p} onChange={() => setPrivacy(p)} />
              <p className="font-medium">{p === "public" ? "Anyone with the link" : "PIN protected"}</p>
              <p className="text-sm text-muted-foreground">{p === "public" ? "Guests open the album straight away." : "Guests enter a PIN before viewing or uploading."}</p>
            </label>
          ))}
        </div>
        {privacy === "pin" && (
          <div className="space-y-1.5">
            <Label htmlFor="pin">{needsPin ? "PIN (4–8 digits)" : "New PIN (leave blank to keep current)"}</Label>
            <Input id="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} required={needsPin} />
          </div>
        )}
        <Toggle label="Allow uploads" hint="Turn off to close the album to new photos." checked={uploadsEnabled} onChange={setUploads} />
        <Toggle label="Show gallery to guests" hint="Guests can browse everyone's photos." checked={galleryVisible} onChange={setGallery} />
        <Toggle label="Allow downloads" hint="Guests can download full-size photos." checked={downloadsEnabled} onChange={setDownloads} />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="mf" label="Max photo size (MB)" min={1} max={25} value={maxFileSizeMb} onChange={setMaxFile} />
          <NumberField id="mg" label="Max photos per guest" min={1} max={500} value={maxUploadsPerGuest} onChange={setMaxGuest} />
        </div>
      </section>

      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        {initial ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

function NumberField({ id, label, min, max, value, onChange }: { id: string; label: string; min: number; max: number; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={min} max={max} required value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
    </div>
  );
}
