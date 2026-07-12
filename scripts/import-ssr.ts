import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from apps/web/.env
dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Require Service Role Key to bypass RLS for inserting data
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env"
  );
  console.error(
    "Please add SUPABASE_SERVICE_ROLE_KEY to your .env file. You can find it in your Supabase Dashboard under Project Settings -> API."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Supabase's JS client limits inserts; batch in chunks to avoid payload/timeout issues
const BATCH_SIZE = 500;

async function importSSRData() {
  console.log("Loading SSR data...");
  const dataPath = path.resolve(__dirname, "./data/ssr.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const ssrData = JSON.parse(rawData);

  const metadata = ssrData.metadata;
  const version = metadata.document_title || "SSR 2022-23";

  console.log(`Starting import: ${version}`);
  console.log(`Total items to import: ${metadata.total_records}`);

  // 1. Check if this version already exists and delete it to prevent duplicates
  const { data: existingVersion, error: fetchError } = await supabase
    .from("ssr_versions")
    .select("id")
    .eq("version", version)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 is "No rows found"
    console.error("Error checking existing version:", fetchError);
    process.exit(1);
  }

  if (existingVersion) {
    console.log(`Version "${version}" already exists. Wiping old data...`);
    // Due to ON DELETE CASCADE on ssr_items, deleting the version deletes the items
    const { error: deleteError } = await supabase
      .from("ssr_versions")
      .delete()
      .eq("id", existingVersion.id);

    if (deleteError) {
      console.error("Error wiping old version:", deleteError);
      process.exit(1);
    }
    console.log("Old data wiped successfully.");
  }

  // Deactivate any other stale active versions to ensure only one is ever active
  const { error: deactivateError } = await supabase
    .from("ssr_versions")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError) {
    console.warn("Warning: could not deactivate old active versions:", deactivateError);
  } else {
    console.log("Deactivated any previous active versions.");
  }

  // 2. Insert the new SSR Version with metadata
  const { data: newVersion, error: versionError } = await supabase
    .from("ssr_versions")
    .insert({
      version: version,
      description: metadata.table_extracted || null,
      effective_date: metadata.effective_date,
      is_active: true,
      total_items: metadata.total_records,
      source_file: metadata.source_file || null,
      document_title: metadata.document_title || null,
      source_pdf_pages: metadata.source_pdf_pages || null,
      field_reference: metadata.field_reference || null,
      known_data_quirks: metadata.known_data_quirks || null,
    })
    .select("id")
    .single();

  if (versionError || !newVersion) {
    console.error("Error inserting SSR version:", versionError);
    process.exit(1);
  }

  const versionId = newVersion.id;
  console.log(`Created SSR version record with ID: ${versionId}`);

  // 3. Prepare items — map JSON fields to DB columns
  const allItems = ssrData.items
    .filter((item: any) => {
      // Remove rows where sr_no is null and item_no is blank
      const isSrNoNull = item.sr_no === null || item.sr_no === undefined;
      const isItemNoBlank = !item.item_no || item.item_no.trim() === "";
      if (isSrNoNull && isItemNoBlank) {
        return false;
      }
      return true;
    })
    .map((item: any) => ({
      sr_no: item.sr_no ?? null,
      chapter: item.chapter || "",
      item_no: item.item_no || "",
      reference_no: item.reference_no || "",
      description: item.description || "",
      additional_specification: item.additional_specification || "",
      unit: item.unit || "",
      completed_rate_inr: item.completed_rate_inr ?? null,
      labour_rate_inr: item.labour_rate_inr ?? null,
      source_page: item.source_page ?? null,
      ssr_version_id: versionId,
    }));

  // 4. Insert in batches
  const totalBatches = Math.ceil(allItems.length / BATCH_SIZE);
  console.log(
    `Inserting ${allItems.length} SSR items in ${totalBatches} batches of ${BATCH_SIZE}...`
  );

  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { error: batchError } = await supabase
      .from("ssr_items")
      .insert(batch);

    if (batchError) {
      console.error(`Error inserting batch ${batchNum}/${totalBatches}:`, batchError);
      // Attempt cleanup: delete the version record (cascades to any items already inserted)
      await supabase.from("ssr_versions").delete().eq("id", versionId);
      console.error("Rolled back version record. Import aborted.");
      process.exit(1);
    }

    console.log(
      `  Batch ${batchNum}/${totalBatches} inserted (${Math.min(i + BATCH_SIZE, allItems.length)}/${allItems.length} items)`
    );
  }

  console.log("\n✅ Import completed successfully!");
  console.log(`   Version: ${version}`);
  console.log(`   Items imported: ${allItems.length}`);
}

importSSRData().catch((err) => {
  console.error("Unexpected error during import:", err);
  process.exit(1);
});
