import { formatDuration, formatPrice } from "@/lib/locale-format";
import { useLanguage } from "@/components/LanguageProvider";
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
import { ADDONS, AUDIENCE, AUDIENCE_IDS, EVENT_TYPE_LABELS, PLAN_IDS, PLAN_TIERS, blurbFor, isAddonId, isAudienceId, isPlanId, priceFor, type AddonId, type AudienceId, type PlanId } from "@/lib/plans";
import { PackageAdvisor } from "./PackageAdvisor";

type Props = { initial?: EventRecord; onSaved: (r: { id: string; slug: string }) => void };

function toLocalDate(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

export function EventForm({ initial, onSaved }: Props) {
  const { t: tr, locale, language } = useLanguage();
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
  const [plan, setPlan] = useState<PlanId>(isPlanId(initial?.plan) ? initial.plan : "trial");
  const [audience, setAudience] = useState<AudienceId>(isAudienceId(initial?.audience_size) ? initial.audience_size : "s");
  const [addons, setAddons] = useState<AddonId[]>((initial?.addons ?? []).filter(isAddonId));
  const total = priceFor(eventType, plan, audience) + addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price ?? 0), 0);
  const maxPhotos = PLAN_TIERS[plan].maxPhotos;
  const [maxUploadsPerGuest, setMaxGuest] = useState(initial?.max_uploads_per_guest ?? 50);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const needsPin = privacy === "pin" && (!initial || initial.privacy !== "pin");

  async function uploadCover(eventId: string): Promise<string | null> {
    if (!cover) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(cover.type) || cover.size > 8 * 1024 * 1024) {
      toast.error(tr("Cover must be a JPEG, PNG or WebP under 8 MB"));
      return null;
    }
    const path = `${eventId}/cover/${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("event-photos").upload(path, cover, { contentType: cover.type });
    if (error) {
      toast.error(tr("Cover upload failed"));
      return null;
    }
    return path;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!SLUG_RE.test(slug)) { toast.error(tr("Link must be 3–60 lowercase letters, numbers or dashes.")); return; }
    if ((needsPin || pin) && !PIN_RE.test(pin)) { toast.error(tr("PIN must be 4–8 digits.")); return; }
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
      audienceSize: audience,
      addons,
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
      toast.success(initial ? tr("Event saved") : tr("Event created"));
      onSaved({ id: res.id, slug: res.slug });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Could not save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">{tr("Details")}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="title">{tr("Event title")}</Label>
          <Input id="title" required maxLength={120} value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="Ayu & Bima" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">{tr("Event link")}</Label>
          <div className="flex items-center rounded-md border border-input bg-background pl-3 text-sm focus-within:ring-1 focus-within:ring-ring">
            <span className="text-muted-foreground">/e/</span>
            <input id="slug" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} className="h-11 flex-1 bg-transparent px-1 outline-none" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="type">{tr("Category")}</Label>
            <select id="type" value={eventType ?? ""} onChange={(e) => setEventType(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{tr(EVENT_TYPE_LABELS[t])}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">{tr("Date")}</Label>
            <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">{tr("Description (optional)")}</Label>
          <Textarea id="desc" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover">{tr("Cover image (optional)")}</Label>
          <Input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-2xl">{tr("Paket")}</h2>
          <p className="text-sm text-muted-foreground">{language === "en" ? "Pricing for" : "Harga untuk"} {tr(EVENT_TYPE_LABELS[eventType ?? "Other"] ?? "acara ini")}{language === "en" ? " varies by guest count. Payments are coming soon." : ", menyesuaikan jumlah tamu. Pembayaran segera hadir."}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aud">{tr("Perkiraan jumlah tamu")}</Label>
          <select id="aud" value={audience} onChange={(e) => setAudience(e.target.value as AudienceId)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
            {AUDIENCE_IDS.map((a) => <option key={a} value={a}>{tr(AUDIENCE[a].label)}</option>)}
          </select>
        </div>
        <PackageAdvisor eventType={eventType ?? "Other"} audience={audience} onApply={(p, a) => { setPlan(p); setAddons(a); toast.success(tr("Rekomendasi diterapkan")); }} />
        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const t = PLAN_TIERS[id];
            return (
              <label key={id} className={`cursor-pointer rounded-xl border p-4 ${plan === id ? "border-gold bg-accent/50" : "border-border"}`}>
                <input type="radio" name="plan" className="sr-only" checked={plan === id} onChange={() => setPlan(id)} />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{tr(t.name)}</p>
                  <p className="font-display text-lg">{formatPrice(priceFor(eventType, id, audience), language)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tr(blurbFor(eventType, id))}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.maxPhotos.toLocaleString(locale)} {tr("photos")} · {tr("active for")} {formatDuration(t.activeDays, language)}
                  {t.zipDownload ? tr(" · unduh ZIP") : ""}{t.hideBranding ? tr(" · tanpa logo") : ""}
                </p>
              </label>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="font-medium">{tr("Add-on")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ADDONS.map((a) => {
              const on = addons.includes(a.id);
              return (
                <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${on ? "border-gold bg-accent/50" : "border-border"}`}>
                  <input type="checkbox" checked={on} onChange={() => setAddons(on ? addons.filter((x) => x !== a.id) : [...addons, a.id])} className="mt-1 accent-[var(--color-gold)]" />
                  <span className="text-sm"><span className="font-medium">{tr(a.name)}</span> · {formatPrice(a.price, language)}<span className="block text-muted-foreground">{tr(a.desc)}</span></span>
                </label>
              );
            })}
          </div>
        </div>
        <p className="text-right">Total: <span className="font-display text-2xl">{formatPrice(total, language)}</span></p>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">{tr("Access")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["public", "pin"] as const).map((p) => (
            <label key={p} className={`cursor-pointer rounded-xl border p-4 ${privacy === p ? "border-gold bg-accent/50" : "border-border"}`}>
              <input type="radio" name="privacy" className="sr-only" checked={privacy === p} onChange={() => setPrivacy(p)} />
              <p className="font-medium">{p === "public" ? tr("Anyone with the link") : tr("PIN protected")}</p>
              <p className="text-sm text-muted-foreground">{p === "public" ? tr("Guests open the album straight away.") : tr("Guests enter a PIN before viewing or uploading.")}</p>
            </label>
          ))}
        </div>
        {privacy === "pin" && (
          <div className="space-y-1.5">
            <Label htmlFor="pin">{needsPin ? tr("PIN (4–8 digits)") : tr("New PIN (leave blank to keep current)")}</Label>
            <Input id="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} required={needsPin} />
          </div>
        )}
        <Toggle label={tr("Allow uploads")} hint={tr("Turn off to close the album to new photos.")} checked={uploadsEnabled} onChange={setUploads} />
        <Toggle label={tr("Show gallery to guests")} hint={tr("Guests can browse everyone's photos.")} checked={galleryVisible} onChange={setGallery} />
        <Toggle label={tr("Allow downloads")} hint={tr("Guests can download full-size photos.")} checked={downloadsEnabled} onChange={setDownloads} />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">{tr("Limits")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="mf" label={tr("Max photo size (MB)")} min={1} max={25} value={maxFileSizeMb} onChange={setMaxFile} />
          <NumberField id="mg" label={tr("Max photos per guest")} min={1} max={500} value={maxUploadsPerGuest} onChange={setMaxGuest} />
        </div>
      </section>

      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        {initial ? tr("Save changes") : tr("Create event")}
      </Button>
    </form>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { t: tr, locale, language } = useLanguage();
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-medium">{tr(label)}</span>
        <span className="block text-sm text-muted-foreground">{tr(hint)}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={tr(label)} />
    </label>
  );
}

function NumberField({ id, label, min, max, value, onChange }: { id: string; label: string; min: number; max: number; value: number; onChange: (n: number) => void }) {
  const { t: tr, locale, language } = useLanguage();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{tr(label)}</Label>
      <Input id={id} type="number" min={min} max={max} required value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
    </div>
  );
}
