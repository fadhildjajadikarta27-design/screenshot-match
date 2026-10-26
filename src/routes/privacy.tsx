import { useLanguage } from "@/components/LanguageProvider";
import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, metaFor } from "@/components/InfoPage";

export const Route = createFileRoute("/privacy")({
  head: () => metaFor("Privacy Policy", "How VELORA handles event photos and account data."),
  component: Privacy,
});

function Privacy() {
  const { t: tr, locale, language } = useLanguage();
  return (
    <InfoPage eyebrow={tr("Legal")} title={tr("Privacy Policy")}>
      <p>{tr("VELORA stores the photos guests upload to an event album, and the account details of event organisers. This is a starter policy — please have it reviewed before launch.")}</p>
      <h2>{tr("Guests")}</h2>
      <p>{tr("Guests do not create accounts. We store uploaded photos, their size and type, and an anonymous, one-way fingerprint used only to prevent spam and enforce upload limits.")}</p>
      <h2>{tr("Organisers")}</h2>
      <p>{tr("We store your email address and the events you create. You can delete any photo or event at any time, which removes the files from storage.")}</p>
      <h2>{tr("Access")}</h2>
      <p>{tr("Photos are kept in private storage and are shown only through short-lived links, to people who can open the album.")}</p>
    </InfoPage>
  );
}
