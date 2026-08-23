<?php

namespace App\Domain\Reports\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only wrapper around `employee_specific_movements_notes_view` — one row
 * per employee-day, with entry_issue/exit_issue precomputed server-side via a
 * check_times join. Powers the reports/issues/justified/unjustified/export
 * report presets. `mvdate` is deliberately left as a plain 'Y-m-d' string
 * (not cast to Carbon) — this is read-only report output, not a value ever
 * manipulated as a date, and casting it would serialize as a full ISO
 * timestamp in JSON responses, which every consumer would then have to
 * re-truncate back to a plain date for display.
 *
 * @property int $id
 * @property string $department
 * @property int $dep_id
 * @property string $rank
 * @property string $rank_category
 * @property int $rank_category_id
 * @property int|null $military_number
 * @property string $fullname_en
 * @property string|null $fullname_ar
 * @property string $gender
 * @property int $dep_parent_id
 * @property string $mvdate
 * @property string|null $checkin_mvtime
 * @property string|null $checkout_mvtime
 * @property string|null $first_mvtype
 * @property string|null $last_mvtype
 * @property int|null $first_automatic
 * @property bool|null $last_automatic
 * @property string|null $first_gate
 * @property string|null $last_gate
 * @property string|null $first_base
 * @property string|null $last_base
 * @property int|null $first_gate_id
 * @property int|null $last_gate_id
 * @property int|null $first_base_id
 * @property int|null $last_base_id
 * @property int $gender_id
 * @property int $rank_id
 * @property int $active
 * @property string|null $notes
 * @property int|null $created_by_id
 * @property string|null $notes_created_at
 * @property string|null $created_by
 * @property string|null $start_time
 * @property string|null $end_time
 * @property int $entry_issue
 * @property int $exit_issue
 */
class EmployeeSpecificMovementsNote extends Model
{
    protected $table = 'employee_specific_movements_notes_view';

    public $timestamps = false;
}
