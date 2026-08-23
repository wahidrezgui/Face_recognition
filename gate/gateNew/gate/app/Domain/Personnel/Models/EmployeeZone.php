<?php

namespace App\Domain\Personnel\Models;

use App\Domain\Gate\Models\Zone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $emp_id
 * @property int $base_id
 * @property int $zone_id
 */
class EmployeeZone extends Model
{
    protected $table = 'employee_zones';

    protected $fillable = [
        'emp_id',
        'base_id',
        'zone_id',
    ];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
