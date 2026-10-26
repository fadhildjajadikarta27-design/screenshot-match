import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — VELORA" },
      { name: "description", content: "Choose a new password for your VELORA account." },
      { property: "og:title", content: "Set a new password — VELORA" },
      { property: "og:description", content: "Choose a new password for your VELORA account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const { t: tr, locale, language } = useLanguage();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Password updated"));
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="mb-5"><LanguageSelector /></div>
      <Wordmark />
      <form onSubmit={submit} className="mt-8 w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-7 shadow-soft">
        <h1 className="font-display text-3xl">{tr("Set a new password")}</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">{tr("New password")}</Label>
          <Input id="pw" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <Button className="w-full" disabled={busy}>{tr("Update password")}</Button>
      </form>
    </div>
  );
}
