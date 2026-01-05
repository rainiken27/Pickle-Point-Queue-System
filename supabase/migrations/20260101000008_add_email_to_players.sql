-- Add email column to players table with unique constraint
ALTER TABLE players
ADD COLUMN email TEXT UNIQUE NOT NULL;

-- Create index on email for faster lookups
CREATE INDEX idx_players_email ON players(email);

-- Update RLS policies to allow players to query by email
CREATE POLICY "Players can check email existence"
ON players FOR SELECT
TO anon
USING (true);

COMMENT ON COLUMN players.email IS 'Player email address - used for unique identification and preventing duplicate registrations';
