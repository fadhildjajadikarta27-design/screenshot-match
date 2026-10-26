import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, metaFor } from "@/components/InfoPage";

export const Route = createFileRoute("/terms")({
  head: () => metaFor("Terms of Service", "The terms for using VELORA shared event albums."),
  component: () => (
    <InfoPage eyebrow="Legal" title="Terms of Service">
      <p>This is a starter terms page — please have it reviewed before launch.</p>
      <h2>Your content</h2>
      <p>Guests keep the rights to the photos they upload and grant the event organiser permission to display and download them within the album.</p>
      <h2>Acceptable use</h2>
      <p>Only upload photos you have the right to share. Organisers are responsible for the albums they create and may remove any photo.</p>
      <h2>Service</h2>
      <p>VELORA is provided as is. Keep your own copies of important photos.</p>
    </InfoPage>
  ),
});
