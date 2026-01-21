-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to receipts
CREATE POLICY "Public read access for payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts');

-- Allow anyone to upload receipts (for cashier check-in)
CREATE POLICY "Anyone can upload payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts');

-- Allow updates to receipts
CREATE POLICY "Anyone can update payment receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-receipts');

-- Allow deletes (for cleanup)
CREATE POLICY "Anyone can delete payment receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts');
