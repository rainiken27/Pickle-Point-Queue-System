-- Create receipts table for payment verification
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  receipt_type TEXT NOT NULL DEFAULT 'physical' CHECK (receipt_type IN ('physical', 'gcash', 'other')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Index for quick lookups by session
CREATE INDEX idx_receipts_session_id ON receipts(session_id);

-- Index for lookups by player
CREATE INDEX idx_receipts_player_id ON receipts(player_id);

-- Index for recent receipts lookup
CREATE INDEX idx_receipts_uploaded_at ON receipts(uploaded_at DESC);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Allow staff to view all receipts
CREATE POLICY "Staff can view all receipts"
ON receipts FOR SELECT
TO authenticated
USING (true);

-- Allow public read for receipts (for display purposes)
CREATE POLICY "Public can view receipts"
ON receipts FOR SELECT
TO anon
USING (true);

-- Allow inserting receipts during check-in
CREATE POLICY "Anyone can create receipts"
ON receipts FOR INSERT
WITH CHECK (true);

-- Allow updates to receipts
CREATE POLICY "Anyone can update receipts"
ON receipts FOR UPDATE
USING (true);
