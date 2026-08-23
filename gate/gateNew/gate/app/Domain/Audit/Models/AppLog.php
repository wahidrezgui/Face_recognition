<?php

namespace App\Domain\Audit\Models;

use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * App-wide audit trail (employee changes, report access, etc.) — not Laravel file logs.
 *
 * @property int $id
 * @property int|null $emp_id
 * @property string $task
 * @property int|null $created_by_id
 * @property string|null $ip_address
 */
class AppLog extends Model
{
    protected $table = 'logs';

    protected $fillable = [
        'emp_id',
        'task',
        'created_by_id',
        'ip_address',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'emp_id');
    }
}
