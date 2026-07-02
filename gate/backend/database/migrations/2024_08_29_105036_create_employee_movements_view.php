<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class CreateEmployeeMovementsView extends Migration
{
    public function up()
    {
        // Drop the view if it already exists
        DB::statement('DROP VIEW IF EXISTS employee_movements');

        // Create the view
        DB::statement("
        CREATE VIEW employee_movements AS
        SELECT
            employees.id,
            departments.name_ar AS department,
            departments.id AS dep_id,
            `ranks`.name_ar AS `rank`,
            ranks_categories.name_ar AS rank_category,
            employees.military_number,
            employees.fullname_en,
            employees.fullname_ar,
            genders.name_ar AS gender,
            employees.dep_parent_id AS dep_parent_id,
            movements.mvdate,
            movements.mvtime,
            movements.mvtype,
            movements.automatic,
            gates.name_ar AS gate,
            bases.name_ar AS base,
            employees.gender_id as gender_id,
            employees.rank_id as rank_id,
            employees.active,
            bases.id AS base_id,
            gates.id AS gate_id
        FROM employees
        JOIN movements ON employees.id = movements.emp_id
        JOIN departments ON employees.dep_id = departments.id
        JOIN genders ON employees.gender_id = genders.id
        JOIN `ranks` ON employees.rank_id = `ranks`.id
        JOIN gates ON movements.gate_id = gates.id
        JOIN bases ON movements.base_id = bases.id
        JOIN ranks_categories ON ranks_categories.id = `ranks`.rank_id
    ");
    }

    public function down()
    {
        // Drop the view in the down method if needed
        DB::statement('DROP VIEW IF EXISTS employee_movements');
    }
}
