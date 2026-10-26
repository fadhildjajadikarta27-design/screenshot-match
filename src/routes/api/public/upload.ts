import { createFileRoute } from "@tanstack/react-router";

// Public guest upload endpoint. Raw HTTP (not a server function) so the browser
// can report per-file upload progress. All authorization happens server-side.
export const Route = createFileRoute("/api/public/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > 27 * 1024 * 1024) {
          return Response.json({ ok: false, error: "File too large.", retry: false }, { status: 413 });
        }
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ ok: false, error: "Invalid upload.", retry: false }, { status: 400 });
        }
        const { processUpload, clientIpFrom } = await import("@/lib/event-core.server");
        const ip = clientIpFrom((n) => request.headers.get(n));
        const res = await processUpload(form, ip, request.headers.get("user-agent") ?? "");
        if (res.ok) return Response.json(res, { headers: { "cache-control": "no-store" } });
        return Response.json(
          { ok: false, error: res.error, retry: res.retry },
          { status: res.status, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
