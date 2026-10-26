import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { EventForm } from "@/components/EventForm";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({
    meta: [
      { title: "New event — VELORA" },
      { name: "description", content: "Create a new shared event album." },
      { property: "og:title", content: "New event — VELORA" },
      { property: "og:description", content: "Create a new shared event album." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <AdminShell>
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Events</Link>
      <h1 className="mt-3 font-display text-4xl">Create an event</h1>
      <div className="mt-8 max-w-2xl">
        <EventForm
          onSaved={({ id }) => {
            qc.invalidateQueries({ queryKey: ["my-events"] });
            navigate({ to: "/events/$id", params: { id } });
          }}
        />
      </div>
    </AdminShell>
  );
}
