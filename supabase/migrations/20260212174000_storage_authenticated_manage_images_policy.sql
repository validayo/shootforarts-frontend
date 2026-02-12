/*
  # Allow authenticated admin UI writes to images bucket

  1. Security
    - storage.objects already has RLS enabled in Supabase managed schema
    - Allow authenticated users to manage objects in bucket_id = 'images'
*/

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage images bucket" ON storage.objects;

  CREATE POLICY "Authenticated users can manage images bucket"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'images')
    WITH CHECK (bucket_id = 'images');
END $$;
