-- Migration: Clone Project RPC
-- Creates a PostgreSQL function to deeply clone a project

CREATE OR REPLACE FUNCTION clone_project_as_template(
  source_project_id UUID,
  new_name VARCHAR(255),
  new_work_order_no VARCHAR(100),
  user_id UUID
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  old_block RECORD;
  new_block_id UUID;
  old_major_item RECORD;
  new_major_item_id UUID;
  old_dim_row RECORD;
  old_recap RECORD;
BEGIN
  -- 1. Insert new Project
  INSERT INTO projects (user_id, name, work_order_no, is_template)
  VALUES (user_id, new_name, new_work_order_no, false)
  RETURNING id INTO new_project_id;

  -- 2. Clone Recapitulation Items
  FOR old_recap IN SELECT * FROM recapitulation_items WHERE project_id = source_project_id LOOP
    INSERT INTO recapitulation_items (
      project_id, description, type, percentage, amount, sequence_number
    ) VALUES (
      new_project_id, old_recap.description, old_recap.type, old_recap.percentage, old_recap.amount, old_recap.sequence_number
    );
  END LOOP;

  -- 3. Clone Measurement Blocks
  FOR old_block IN SELECT * FROM measurement_blocks WHERE project_id = source_project_id LOOP
    INSERT INTO measurement_blocks (
      project_id, ssr_item_id, custom_description, custom_unit, custom_rate, sequence_number
    ) VALUES (
      new_project_id, old_block.ssr_item_id, old_block.custom_description, old_block.custom_unit, old_block.custom_rate, old_block.sequence_number
    )
    RETURNING id INTO new_block_id;

    -- 4. Clone Major Items for this block
    FOR old_major_item IN SELECT * FROM measurement_major_items WHERE measurement_block_id = old_block.id LOOP
      INSERT INTO measurement_major_items (
        measurement_block_id, description, sequence_number
      ) VALUES (
        new_block_id, old_major_item.description, old_major_item.sequence_number
      )
      RETURNING id INTO new_major_item_id;

      -- 5. Clone Dimension Rows, setting dimension values to 0!
      FOR old_dim_row IN SELECT * FROM measurement_dimension_rows WHERE major_item_id = old_major_item.id LOOP
        INSERT INTO measurement_dimension_rows (
          major_item_id, description, "number", length, breadth, depth, sequence_number
        ) VALUES (
          new_major_item_id, old_dim_row.description, 0, 0, 0, 0, old_dim_row.sequence_number
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
