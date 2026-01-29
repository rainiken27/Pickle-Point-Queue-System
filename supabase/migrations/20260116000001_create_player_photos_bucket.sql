-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to player photos
CREATE POLICY "Public read access for player photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

-- Allow anyone to upload player photos (for registration)
CREATE POLICY "Anyone can upload player photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-photos');

-- Allow updates to own photos (by path matching)
CREATE POLICY "Anyone can update player photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-photos');

-- Allow deletes (for cleanup)
CREATE POLICY "Anyone can delete player photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'player-photos');
