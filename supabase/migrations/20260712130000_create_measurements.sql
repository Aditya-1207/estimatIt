-- Migration: Phase 5 Measurement Sheet Data Entry
-- Creates measurement_blocks, major_items, and dimension_rows tables with RLS

-- 1. Measurement Blocks
CREATE TABLE IF NOT EXISTS measurement_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  ssr_item_id UUID REFERENCES ssr_items(id) ON DELETE SET NULL,
  custom_description TEXT,
  custom_rate NUMERIC,
  custom_unit VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurement_blocks_project_id ON measurement_blocks(project_id);

-- Attach trigger to measurement_blocks for updated_at
DROP TRIGGER IF EXISTS trigger_measurement_blocks_updated_at ON measurement_blocks;
CREATE TRIGGER trigger_measurement_blocks_updated_at
BEFORE UPDATE ON measurement_blocks
FOR EACH ROW
EXECUTE FUNCTION set_current_timestamp_updated_at();

-- RLS for measurement_blocks
ALTER TABLE measurement_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own project's measurement blocks"
  ON measurement_blocks
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 2. Major Items
CREATE TABLE IF NOT EXISTS major_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES measurement_blocks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_major_items_block_id ON major_items(block_id);

-- RLS for major_items
ALTER TABLE major_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own project's major items"
  ON major_items
  FOR ALL
  TO authenticated
  USING (
    block_id IN (
      SELECT mb.id FROM measurement_blocks mb
      JOIN projects p ON mb.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    block_id IN (
      SELECT mb.id FROM measurement_blocks mb
      JOIN projects p ON mb.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- 3. Dimension Rows
CREATE TABLE IF NOT EXISTS dimension_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  major_item_id UUID NOT NULL REFERENCES major_items(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  number NUMERIC DEFAULT 0,
  length NUMERIC DEFAULT 0,
  breadth NUMERIC DEFAULT 0,
  depth NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dimension_rows_major_item_id ON dimension_rows(major_item_id);

-- Attach trigger to dimension_rows for updated_at
DROP TRIGGER IF EXISTS trigger_dimension_rows_updated_at ON dimension_rows;
CREATE TRIGGER trigger_dimension_rows_updated_at
BEFORE UPDATE ON dimension_rows
FOR EACH ROW
EXECUTE FUNCTION set_current_timestamp_updated_at();

-- RLS for dimension_rows
ALTER TABLE dimension_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own project's dimension rows"
  ON dimension_rows
  FOR ALL
  TO authenticated
  USING (
    major_item_id IN (
      SELECT mi.id FROM major_items mi
      JOIN measurement_blocks mb ON mi.block_id = mb.id
      JOIN projects p ON mb.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    major_item_id IN (
      SELECT mi.id FROM major_items mi
      JOIN measurement_blocks mb ON mi.block_id = mb.id
      JOIN projects p ON mb.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
