import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { InfoPage, metaFor } from "@/components/InfoPage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => metaFor("Pricing", "Simple pricing for VELORA shared event albums."),
  component: Pricing,
});

const plans = [
  { name: "Free", price: "€0", note: "Available now", features: ["Unlimited events", "Up to 2,000 photos per event", "QR code & print card", "PIN-protected albums"], cta: true },
  { name: "Celebration", price: "Soon", note: "Coming later", features: ["Larger albums", "Longer storage", "Custom album themes"], cta: false },
  { name: "Business", price: "Soon", note: "Coming later", features: ["Team accounts", "Branded QR cards", "Priority support"], cta: false },
];

function Pricing() {
  return (
    <InfoPage eyebrow="Pricing" title="Simple, honest pricing">
      <p>VELORA is free while we're in early access. Paid plans will add more space — never surprise fees.</p>
      <div className="not-prose mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className="rounded-2xl border border-border bg-card p-6 text-foreground">
            <p className="eyebrow">{p.note}</p>
            <h2 className="!mt-2 font-display text-2xl">{p.name}</h2>
            <p className="mt-2 font-display text-4xl">{p.price}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-gold" />{f}</li>
              ))}
            </ul>
            {p.cta && (
              <Button asChild className="mt-6 w-full"><Link to="/auth" search={{ mode: "signup" }}>Start free</Link></Button>
            )}
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
