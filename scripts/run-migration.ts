import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Drop old columns
ALTER TABLE ssr_items DROP COLUMN IF EXISTS item_code;
ALTER TABLE ssr_items DROP COLUMN IF EXISTS rate;
ALTER TABLE ssr_items DROP COLUMN IF EXISTS category;

-- Add real SSR columns
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS sr_no INTEGER;
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS chapter VARCHAR NOT NULL DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS item_no VARCHAR NOT NULL DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS reference_no TEXT DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS additional_specification TEXT DEFAULT '';
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS completed_rate_inr NUMERIC(12, 2);
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS labour_rate_inr NUMERIC(12, 2);
ALTER TABLE ssr_items ADD COLUMN IF NOT EXISTS source_page INTEGER;

-- Recreate indexes
DROP INDEX IF EXISTS idx_ssr_items_code;
CREATE INDEX IF NOT EXISTS idx_ssr_items_item_no ON ssr_items(item_no);
CREATE INDEX IF NOT EXISTS idx_ssr_items_chapter ON ssr_items(chapter);

-- Add metadata columns to ssr_versions
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS document_title TEXT;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS source_pdf_pages TEXT;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS field_reference JSONB;
ALTER TABLE ssr_versions ADD COLUMN IF NOT EXISTS known_data_quirks JSONB;
`;

async function runMigration() {
  console.log("Running migration: alter ssr_items to real schema...");

  const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

  if (error) {
    // rpc exec_sql might not exist — fall back to raw REST call
    console.log("rpc exec_sql not available, trying direct SQL via management API...");
    
    // Use the Supabase Management API to run SQL
    const projectRef = new URL(supabaseUrl!).hostname.split(".")[0];
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (!res.ok) {
      console.error("Management API also failed. Please run the migration manually.");
      console.error("Go to your Supabase Dashboard → SQL Editor and paste the contents of:");
      console.error("  supabase/migrations/20260712110000_alter_ssr_items_real_schema.sql");
      process.exit(1);
    }

    console.log("Migration applied via Management API.");
    return;
  }

  console.log("✅ Migration applied successfully!");
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
