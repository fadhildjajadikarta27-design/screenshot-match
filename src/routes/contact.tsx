import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, metaFor } from "@/components/InfoPage";

export const Route = createFileRoute("/contact")({
  head: () => metaFor("Contact", "Get in touch with the VELORA team."),
  component: Contact,
});

function Contact() {
  const { t: tr, locale, language } = useLanguage();
  return (
    <InfoPage eyebrow={tr("Say hello")} title={tr("Contact")}>
      <p>{tr("Questions about an event, an album, or a partnership? Write to us and we'll reply within one business day.")}</p>
      <p>
        <a className="text-foreground underline underline-offset-4" href="mailto:hello@velora.app">hello@velora.app</a>
      </p>
    </InfoPage>
  );
}
