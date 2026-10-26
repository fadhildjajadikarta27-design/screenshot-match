CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$'),
  event_type TEXT,
  event_date TIMESTAMPTZ,
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  cover_image_path TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','pin')),
  access_pin_hash TEXT,
  uploads_enabled BOOLEAN NOT NULL DEFAULT true,
  downloads_enabled BOOLEAN NOT NULL DEFAULT true,
  gallery_visible BOOLEAN NOT NULL DEFAULT true,
  max_file_size_mb INTEGER NOT NULL DEFAULT 15 CHECK (max_file_size_mb BETWEEN 1 AND 25),
  max_photos INTEGER NOT NULL DEFAULT 2000 CHECK (max_photos BETWEEN 1 AND 20000),
  max_uploads_per_guest INTEGER NOT NULL DEFAULT 50 CHECK (max_uploads_per_guest BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pin_required CHECK (privacy = 'public' OR access_pin_hash IS NOT NULL)
);
CREATE INDEX events_owner_id_idx ON public.events(owner_id);
CREATE INDEX events_slug_idx ON public.events(slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner select events" ON public.events FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "owner insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner update events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner delete events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  original_filename TEXT,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  width INTEGER,
  height INTEGER,
  uploader_hash TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX photos_event_id_idx ON public.photos(event_id);
CREATE INDEX photos_uploaded_at_idx ON public.photos(uploaded_at DESC);
CREATE INDEX photos_event_uploaded_idx ON public.photos(event_id, uploaded_at DESC, id DESC);
CREATE INDEX photos_event_uploader_idx ON public.photos(event_id, uploader_hash);
GRANT SELECT, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner select photos" ON public.photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "owner delete photos" ON public.photos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));

-- Rate limiting log for public uploads (server-only)
CREATE TABLE public.upload_attempts (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  client_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX upload_attempts_lookup_idx ON public.upload_attempts(client_hash, created_at DESC);
GRANT ALL ON public.upload_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.upload_attempts_id_seq TO service_role;
ALTER TABLE public.upload_attempts ENABLE ROW LEVEL SECURITY;

-- Per-event stats for the owner dashboard
CREATE OR REPLACE FUNCTION public.my_event_stats()
RETURNS TABLE (event_id UUID, photo_count BIGINT, total_bytes BIGINT, last_upload TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT e.id, COUNT(p.id), COALESCE(SUM(p.file_size),0)::bigint, MAX(p.uploaded_at)
  FROM public.events e LEFT JOIN public.photos p ON p.event_id = e.id
  WHERE e.owner_id = auth.uid()
  GROUP BY e.id
$$;
REVOKE EXECUTE ON FUNCTION public.my_event_stats() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_event_stats() TO authenticated;