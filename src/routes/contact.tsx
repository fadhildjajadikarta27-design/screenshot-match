import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, metaFor } from "@/components/InfoPage";

export const Route = createFileRoute("/contact")({
  head: () => metaFor("Contact", "Get in touch with the VELORA team."),
  component: () => (
    <InfoPage eyebrow="Say hello" title="Contact">
      <p>Questions about an event, an album, or a partnership? Write to us and we'll reply within one business day.</p>
      <p>
        <a className="text-foreground underline underline-offset-4" href="mailto:hello@velora.app">hello@velora.app</a>
      </p>
    </InfoPage>
  ),
});
