import { Globe } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { Button } from "./ui/button";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  return (
    <div role="group" aria-label="Language / Bahasa" className="no-print flex shrink-0 items-center gap-0.5">
      <Globe className="mr-1 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
      <Button size="sm" variant={language === "id" ? "secondary" : "ghost"} className="h-8 px-2 text-xs" aria-pressed={language === "id"} title="Bahasa Indonesia" onClick={() => setLanguage("id")}>ID</Button>
      <Button size="sm" variant={language === "en" ? "secondary" : "ghost"} className="h-8 px-2 text-xs" aria-pressed={language === "en"} title="English" onClick={() => setLanguage("en")}>EN</Button>
    </div>
  );
}