<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class CreateEmployeeSpecificMovementsNotesView extends Migration
{
    public function up()
    {
        // Drop the view if it already exists
        DB::statement('DROP VIEW IF EXISTS employee_specific_movements_notes_view');

        // Create the view
        DB::statement("
            CREATE VIEW employee_specific_movements_notes_view AS
			WITH FirstCheckIn AS (
				SELECT
					emp_dates.emp_id,
					emp_dates.mvdate,
					COALESCE(m1.mvtime, NULL) AS mvtime,
					COALESCE(m1.mvtype, NULL) AS mvtype,
					COALESCE(m1.gate_id, NULL) AS gate_id,
					COALESCE(m1.base_id, NULL) AS base_id,
					COALESCE(m1.automatic, NULL) AS automatic
				FROM (
					SELECT DISTINCT emp_id, mvdate
					FROM movements
				) AS emp_dates
				LEFT JOIN (
					SELECT
						m1.emp_id,
						m1.mvdate,
						m1.mvtime,
						m1.mvtype,
						m1.gate_id,
						m1.base_id,
						m1.automatic
					FROM movements m1
					WHERE m1.mvtype = 'Check-In' 
					AND m1.mvtime = (
						SELECT MIN(m2.mvtime)
						FROM movements m2
						WHERE m2.emp_id = m1.emp_id
						AND m2.mvdate = m1.mvdate
						AND m2.mvtype = 'Check-In' 
					)
				) AS m1 ON emp_dates.emp_id = m1.emp_id AND emp_dates.mvdate = m1.mvdate
			),
            LastCheckOut AS (
                SELECT
                    m1.emp_id,
                    m1.mvdate,
                    m1.mvtime,
                    m1.mvtype,
                    m1.gate_id,
                    m1.base_id,
                    m1.automatic
                FROM movements m1
                WHERE m1.mvtype = 'Check-Out'
                AND m1.mvtime = (
                    SELECT MAX(m2.mvtime)
                    FROM movements m2
                    WHERE m2.emp_id = m1.emp_id
                    AND m2.mvdate = m1.mvdate
                    AND m2.mvtype = 'Check-Out'
                )
            )
            SELECT
                emp.id,
                emp.department,
                emp.dep_id,
                emp.`rank`,
                emp.rank_category,
                emp.rank_category_id,
                emp.military_number,
                emp.fullname_en,
                emp.fullname_ar,
                emp.gender,
                emp.dep_parent_id,
                first_mv.mvdate AS mvdate,
                first_mv.mvtime AS checkin_mvtime,
                last_mv.mvtime AS checkout_mvtime,
                first_mv.mvtype AS first_mvtype,
                last_mv.mvtype AS last_mvtype,
                first_mv.automatic AS first_automatic,
                last_mv.automatic AS last_automatic,
                first_gate.name_ar AS first_gate,
                last_gate.name_ar AS last_gate,
                first_base.name_ar AS first_base,
                last_base.name_ar AS last_base,
                first_gate.id AS first_gate_id,
                last_gate.id AS last_gate_id,
                first_base.id AS first_base_id,
                last_base.id AS last_base_id,
                emp.gender_id,
                emp.rank_id,
                emp.active,
                notes.notes,
                check_times.start_time AS start_time,
                check_times.end_time AS end_time,
                CASE 
                    WHEN first_mv.mvtime > check_times.start_time THEN 1 
                    ELSE 0 
                END AS entry_issue,
                CASE 
                    WHEN last_mv.mvtime < check_times.end_time THEN 1 
                    ELSE 0 
                END AS exit_issue
            FROM 
            (
                SELECT
                    employees.id,
                    departments.name_ar AS department,
                    departments.id AS dep_id,
                    `ranks`.name_ar AS `rank`,
                    ranks_categories.name_ar AS rank_category,
                    ranks_categories.id AS rank_category_id,
                    employees.military_number,
                    employees.fullname_en,
                    employees.fullname_ar,
                    genders.name_ar AS gender,
                    employees.dep_parent_id,
                    employees.gender_id,
                    employees.rank_id,
                    employees.active
                FROM employees
                JOIN departments ON employees.dep_id = departments.id
                JOIN genders ON employees.gender_id = genders.id
                JOIN `ranks` ON employees.rank_id = `ranks`.id
                JOIN ranks_categories ON ranks_categories.id = ranks.rank_id
            ) AS emp
            LEFT JOIN FirstCheckIn AS first_mv ON emp.id = first_mv.emp_id
            LEFT JOIN LastCheckOut AS last_mv ON emp.id = last_mv.emp_id AND first_mv.mvdate = last_mv.mvdate
            LEFT JOIN gates AS first_gate ON first_mv.gate_id = first_gate.id
            LEFT JOIN bases AS first_base ON first_mv.base_id = first_base.id
            LEFT JOIN gates AS last_gate ON last_mv.gate_id = last_gate.id
            LEFT JOIN bases AS last_base ON last_mv.base_id = last_base.id
            LEFT JOIN employee_notes AS notes ON emp.id = notes.emp_id AND first_mv.mvdate = notes.mvdate
			LEFT JOIN check_times ON check_times.dep_id = 
				COALESCE(
					(SELECT dep_id FROM check_times WHERE dep_id = emp.dep_id AND gender_id = emp.gender_id AND rank_id = emp.rank_category_id LIMIT 1),
					emp.dep_parent_id
				)
				AND check_times.gender_id = emp.gender_id
				AND check_times.rank_id = emp.rank_category_id;

        ");
    }

    public function down()
    {
        // Drop the view in the down method if needed
        DB::statement('DROP VIEW IF EXISTS employee_specific_movements_notes_view');
    }
}
