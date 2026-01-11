-- Create inscriptions table to store data from Google Sheets
CREATE TABLE IF NOT EXISTS inscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL, -- CPF, ID, or other unique identifier from sheets
  data JSONB NOT NULL, -- All row data as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on external_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_inscriptions_external_id ON inscriptions(external_id);

-- Create index on JSONB data for common queries
CREATE INDEX IF NOT EXISTS idx_inscriptions_data_gin ON inscriptions USING GIN (data);

-- Enable Row Level Security
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Master users can see all inscriptions
CREATE POLICY "Masters can view all inscriptions"
  ON inscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Policy: Suporte users can see all inscriptions
CREATE POLICY "Suporte can view all inscriptions"
  ON inscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'suporte'
    )
  );

-- Policy: Common users see only their generation
-- Assumes the Google Sheets has a column for generation (GERAÇÃO, TURMA, etc.)
CREATE POLICY "Common users see their generation"
  ON inscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'comum'
      AND (
        profiles.generation IS NULL -- If no generation restriction, see all
        OR (data->>'GERAÇÃO')::text = profiles.generation
        OR (data->>'GERACAO')::text = profiles.generation
        OR (data->>'TURMA')::text = profiles.generation
      )
    )
  );

-- Policy: Masters can insert/update/delete
CREATE POLICY "Masters can manage inscriptions"
  ON inscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Create app_config table for shared configuration
CREATE TABLE IF NOT EXISTS app_config (
  id TEXT PRIMARY KEY DEFAULT 'global',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on app_config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read config
CREATE POLICY "Everyone can read config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only masters can update config
CREATE POLICY "Only masters can update config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Insert default config if not exists
INSERT INTO app_config (id, config)
VALUES ('global', '{
  "sheetUrl": "",
  "scriptUrl": "",
  "groupCol": "",
  "displayCols": [],
  "color": "#1e3a8a",
  "iconColor": "#ffffff",
  "borderRadius": 20,
  "fontFamily": "Inter, sans-serif"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_inscriptions_updated_at ON inscriptions;
CREATE TRIGGER update_inscriptions_updated_at
  BEFORE UPDATE ON inscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
