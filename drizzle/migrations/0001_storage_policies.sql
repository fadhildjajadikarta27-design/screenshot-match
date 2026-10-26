CREATE OR REPLACE FUNCTION public.owns_event_folder(_name TEXT)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text = split_part(_name, '/', 1) AND e.owner_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.owns_event_folder(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.owns_event_folder(TEXT) TO authenticated;

CREATE POLICY "owners read event files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-photos' AND public.owns_event_folder(name));
CREATE POLICY "owners upload covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-photos' AND split_part(name, '/', 2) = 'cover' AND public.owns_event_folder(name));
CREATE POLICY "owners delete event files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-photos' AND public.owns_event_folder(name));