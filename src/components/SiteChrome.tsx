import { useLanguage } from "@/components/LanguageProvider";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

export function SiteHeader() {
  const { t: tr, locale, language } = useLanguage();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link to="/demo" className="hidden px-3 text-sm text-muted-foreground hover:text-foreground sm:inline">
            Demo
          </Link>
          <Link to="/pricing" className="hidden px-3 text-sm text-muted-foreground hover:text-foreground sm:inline">
            {tr("Pricing")}
          </Link>
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">{tr("Dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Link to="/auth" className="px-3 text-sm text-muted-foreground hover:text-foreground">
                {tr("Sign in")}
              </Link>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>{tr("Get started")}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t: tr, locale, language } = useLanguage();
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark />
          <p className="mt-2 text-sm text-muted-foreground">{tr("Every Moment, Shared.")}</p>
        </div>
        <nav className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">{tr("Privacy")}</Link>
          <Link to="/terms" className="hover:text-foreground">{tr("Terms")}</Link>
          <Link to="/contact" className="hover:text-foreground">{tr("Contact")}</Link>
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VELORA</p>
      </div>
    </footer>
  );
}
