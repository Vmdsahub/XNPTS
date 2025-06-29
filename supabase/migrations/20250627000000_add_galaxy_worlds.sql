/*
  # Galaxy Worlds Migration
  
  Migrates galaxy map world positions from localStorage to database for proper persistence
*/

-- Galaxy worlds table for storing world positions and properties
CREATE TABLE IF NOT EXISTS galaxy_worlds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  x_position integer NOT NULL CHECK (x_position >= 0 AND x_position <= 100),
  y_position integer NOT NULL CHECK (y_position >= 0 AND y_position <= 100),
  scale real NOT NULL DEFAULT 1.0 CHECK (scale > 0),
  order_index integer NOT NULL,
  is_active boolean DEFAULT true,
  unlock_requirement jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE galaxy_worlds ENABLE ROW LEVEL SECURITY;

-- Users can read galaxy worlds
CREATE POLICY "Users can read galaxy worlds"
  ON galaxy_worlds FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify galaxy worlds  
CREATE POLICY "Admins can modify galaxy worlds"
  ON galaxy_worlds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Insert default galaxy worlds
INSERT INTO galaxy_worlds (name, image_url, x_position, y_position, scale, order_index) VALUES
  ('Nexus Prime', 'https://cdn.builder.io/api/v1/image/assets%2F00527235c81749aeadef448eefcc705e%2Fa8f8439a99054a64b3fb9dd9c9f27e47?format=webp&width=200', 20, 30, 1.0, 1),
  ('Terra Nova', 'https://cdn.builder.io/api/v1/image/assets%2F00527235c81749aeadef448eefcc705e%2F5b8b7e5f99054a64b3fb9dd9c9f27e47?format=webp&width=200', 70, 20, 1.0, 2),
  ('Crimson Wastes', 'https://cdn.builder.io/api/v1/image/assets%2F00527235c81749aeadef448eefcc705e%2Fc9d8e6f809154b74a4gc0ee0d0f38f58?format=webp&width=200', 15, 75, 1.0, 3),
  ('Azure Depths', 'https://cdn.builder.io/api/v1/image/assets%2F00527235c81749aeadef448eefcc705e%2Fd0e9f7g910264c85b5hd1ff1e1g49g69?format=webp&width=200', 85, 60, 1.0, 4),
  ('Void Sanctum', 'https://cdn.builder.io/api/v1/image/assets%2F00527235c81749aeadef448eefcc705e%2Fe1f0g8h021374d96c6ie2gg2f2h50h70?format=webp&width=200', 50, 50, 1.0, 5);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_galaxy_worlds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_galaxy_worlds_updated_at
  BEFORE UPDATE ON galaxy_worlds
  FOR EACH ROW
  EXECUTE FUNCTION update_galaxy_worlds_updated_at();
