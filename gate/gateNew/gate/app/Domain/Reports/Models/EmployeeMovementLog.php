<?php

namespace App\Domain\Reports\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only wrapper around `employee_movements` — a flat one-row-per-movement
 * log, joined against employee/department/rank/gate/base. Powers the
 * "individual" report preset. `mvdate` is deliberately left as a plain
 * 'Y-m-d' string, not cast to Carbon — see EmployeeSpecificMovementsNote for why.
 *
 * @property int $id
 * @property string $department
 * @property int $dep_id
 * @property string $rank
 * @property string $rank_category
 * @property int|null $military_number
 * @property string $fullname_en
 * @property string|null $fullname_ar
 * @property string $gender
 * @property int $dep_parent_id
 * @property string $mvdate
 * @property string $mvtime
 * @property string $mvtype
 * @property bool $automatic
 * @property string|null $gate
 * @property string|null $base
 * @property int $gender_id
 * @property int $rank_id
 * @property int $active
 * @property int|null $base_id
 * @property int|null $gate_id
 */
class EmployeeMovementLog extends Model
{
    protected $table = 'employee_movements';

    public $timestamps = false;
}
