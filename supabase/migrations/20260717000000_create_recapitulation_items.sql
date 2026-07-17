-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 10: Recapitulation Items
--
-- One row per percentage-based addition per project.
-- Default items (Contingency 3%, QC 1%, Insurance 1%, GST 18%) are seeded
-- from the app when the Recapitulation tab is first opened on a project.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recapitulation_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description      text        NOT NULL,
  percentage       numeric(6,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0),
  sequence_number  integer     NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-project lookup
CREATE INDEX IF NOT EXISTS recapitulation_items_project_id_idx
  ON recapitulation_items (project_id, sequence_number);

-- Row Level Security
ALTER TABLE recapitulation_items ENABLE ROW LEVEL SECURITY;

-- Users can only access recap items for their own projects
CREATE POLICY "Users can manage their own recap items"
  ON recapitulation_items
  FOR ALL
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

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_recapitulation_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recapitulation_items_updated_at
  BEFORE UPDATE ON recapitulation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_recapitulation_items_updated_at();
