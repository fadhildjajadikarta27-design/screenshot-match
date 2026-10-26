# VELORA — Every Moment, Shared.

Event photo-sharing: guests scan a QR code and upload photos with no app or account.

## Stack
TanStack Start (React 19 + Vite) · Tailwind v4 · Lovable Cloud (Postgres, Auth, Storage) · `qrcode` · Capacitor (Android shell).

## Local development
```
bun install
cp .env.example .env   # fill in values
bun run dev
bun run test
```

## Database
Migrations live in `drizzle/migrations/` (tables `profiles`, `events`, `photos`, `upload_attempts`, RLS policies, storage policies). Apply them in order on a fresh project, then create a **private** storage bucket `event-photos` (25 MB limit).

## Security model
- Owners manage only their own events/photos (RLS on `auth.uid()`).
- Guests never touch the database directly. All guest reads/uploads go through server code that checks the event exists, uploads are enabled, PIN access, size, file signature (magic bytes), per-album/per-guest limits and rate limits.
- PINs are hashed with PBKDF2; unlocking issues an HMAC-signed token (signed with `EVENT_ACCESS_SECRET`) that is revoked when the PIN changes. PIN attempts are rate limited.
- Photos are in a private bucket and only served via short-lived signed URLs.
- The service-role key is only used server-side.

## Android (Capacitor)
The app renders on the server, so the APK is a native shell that loads the published URL (`capacitor.config.ts`, `VELORA_APP_URL`). No photos are bundled.
GitHub Actions workflow `.github/workflows/android-debug-apk.yml` builds a **debug APK** (unsigned for distribution, for testing only) and uploads it as an artifact. Set the repository variable `VELORA_APP_URL`. A signed **release APK** needs a keystore + `assembleRelease` signing config (not included).

## Known limitations
- Thumbnails/compression are generated on the guest's phone (canvas); if that fails, the original is used as the thumbnail.
- Per-guest limits use a device+network fingerprint and can be bypassed by a determined user; network-level rate limits remain.
- Pricing plans are display-only.
