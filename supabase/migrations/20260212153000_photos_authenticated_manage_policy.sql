/*
  # Allow authenticated admin UI writes to photos

  1. Security
    - Keep RLS enabled on public.photos
    - Allow authenticated users to manage photos from client-side admin UI
*/

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage photos" ON public.photos;

  CREATE POLICY "Authenticated users can manage photos"
    ON public.photos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.photos TO authenticated;
