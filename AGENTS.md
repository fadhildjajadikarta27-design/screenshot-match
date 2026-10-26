<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Guest (public) access goes only through server code (`src/lib/public-event.functions.ts`, `/api/public/upload`) using the admin client after explicit checks; never add anon RLS policies — keeps private events unreadable.
- Guest uploads use a raw server route (not a server fn) so the browser gets per-file upload progress via XHR.
- Server-only helpers (`*.server.ts`) are dynamically imported inside handlers so they never enter the client bundle.
- Android is a Capacitor shell loading the hosted URL because the app is server-rendered.
- Plan tiers and per-event-type prices live only in `src/lib/plans.ts`; server (saveEvent, uploads) derives photo limits and expiry from it so the UI and enforcement never drift.
