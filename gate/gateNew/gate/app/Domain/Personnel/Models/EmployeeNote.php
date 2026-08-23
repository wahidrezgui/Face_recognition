<?php

namespace App\Domain\Personnel\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $emp_id
 * @property Carbon $mvdate
 * @property string $notes
 * @property int|null $created_by_id
 */
class EmployeeNote extends Model
{
    protected $table = 'employee_notes';

    protected $fillable = [
        'emp_id',
        'mvdate',
        'notes',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'mvdate' => 'date:Y-m-d',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
