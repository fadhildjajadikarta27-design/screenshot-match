import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function ApertureMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-6 w-6", className)} fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 1.5 L22 12 M30.5 16 L20 22 M16 30.5 L10 20 M1.5 16 L12 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="5" className="fill-gold" />
    </svg>
  );
}

export function Wordmark({ className, linked = true }: { className?: string; linked?: boolean }) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <ApertureMark />
      <span className="font-display text-2xl tracking-[0.28em]">VELORA</span>
    </span>
  );
  return linked ? (
    <Link to="/" aria-label="VELORA home" className="rounded-md focus-visible:outline-2 focus-visible:outline-ring">
      {inner}
    </Link>
  ) : (
    inner
  );
}
