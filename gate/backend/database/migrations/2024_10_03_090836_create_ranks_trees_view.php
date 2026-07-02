<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class CreateRanksTreesView extends Migration
{
    public function up()
    {
        // Drop the view if it already exists
        DB::statement('DROP VIEW IF EXISTS ranks_trees_view');

        // Create the view
        DB::statement("
            CREATE VIEW ranks_trees_view AS
            WITH RankedCategories AS (
                SELECT 
                    rc.id AS original_id,  -- Store original id for reference
                    ROW_NUMBER() OVER (ORDER BY rc.ordre) + 999 AS id,  -- Generate unique ID for level 1 starting from 1000
                    rc.name_en,
                    rc.name_ar
                FROM 
                    ranks_categories rc
            ),
            RankedParents AS (
                SELECT 
                    rp.id AS original_id,  -- Store original id for reference
                    ROW_NUMBER() OVER (ORDER BY rp.ordre) + 1999 AS id,  -- Generate unique ID for level 2 starting from 2000
                    rp.name_en,
                    rp.name_ar,
                    rc.id AS parent_id  -- This will be the generated ID for the associated level 1
                FROM 
                    ranks_parents rp
                JOIN 
                    ranks_categories rc ON rc.id = rp.ranks_categories_id
            )
            SELECT 
                rc.id AS id,  -- Unique ID from the generated level 1
                rc.name_en,   -- English name from level 1
                rc.name_ar,   -- Arabic name from level 1
                0 AS parent_id  -- Level 1 parent_id set to 0
            FROM 
                RankedCategories rc

            UNION ALL

            SELECT 
                rp.id AS id,  -- Unique ID from the generated level 2
                rp.name_en,   -- English name from level 2
                rp.name_ar,   -- Arabic name from level 2
                rc.id AS parent_id  -- Set parent_id to level 1 ID
            FROM 
                RankedParents rp
            JOIN 
                RankedCategories rc ON rc.original_id = rp.parent_id  -- Join to get the generated ID for level 1

            UNION ALL

            SELECT 
                r.id AS id,  -- Use actual ID from ranks table for level 3
                r.name_en,   -- English name from level 3
                r.name_ar,   -- Arabic name from level 3
                rp.id AS parent_id  -- Set parent_id to level 2 ID
            FROM 
                ranks r
            JOIN 
                RankedParents rp ON r.ranks_parents_id = rp.original_id;
        ");
    }

    public function down()
    {
        // Drop the view in the down method if needed
        DB::statement('DROP VIEW IF EXISTS ranks_trees_view');
    }
}
