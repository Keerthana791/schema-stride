-- Update RLS policy to allow unauthenticated users to view institutions
DROP POLICY IF EXISTS "Institutions are viewable by all authenticated users" ON institutions;

CREATE POLICY "Institutions are viewable by everyone"
  ON institutions
  FOR SELECT
  USING (true);