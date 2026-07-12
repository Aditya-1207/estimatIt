-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ssr_versions table
CREATE TABLE IF NOT EXISTS ssr_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR NOT NULL,
  description TEXT,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ssr_items table
CREATE TABLE IF NOT EXISTS ssr_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code VARCHAR NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR NOT NULL,
  rate NUMERIC(12, 2) NOT NULL,
  category VARCHAR NOT NULL,
  ssr_version_id UUID NOT NULL REFERENCES ssr_versions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ssr_items_version ON ssr_items(ssr_version_id);
CREATE INDEX IF NOT EXISTS idx_ssr_items_code ON ssr_items(item_code);
-- Full text search index could be added later for complex text searches

-- Row Level Security
ALTER TABLE ssr_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssr_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow authenticated users to read ssr_versions" 
  ON ssr_versions FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to read ssr_items" 
  ON ssr_items FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow service role (or full bypass) to manage items
CREATE POLICY "Allow service role to manage ssr_versions" 
  ON ssr_versions FOR ALL 
  TO service_role 
  USING (true);

CREATE POLICY "Allow service role to manage ssr_items" 
  ON ssr_items FOR ALL 
  TO service_role 
  USING (true);
