<?php

namespace App\Domain\Personnel\Models;

use App\Domain\Gate\Models\Base;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Print-history audit trail for employee access cards. Each row is also the
 * "owned card" instance itself — `returned_at`/`returned_by` track whether
 * this specific printed card has been handed back in.
 *
 * @property int $id
 * @property int $emp_id
 * @property int|null $base_id
 * @property Carbon|null $badge_expiry_date
 * @property Carbon $date_printed
 * @property Carbon|null $returned_at
 * @property int|null $returned_by
 * @property int|null $created_by
 */
class BadgeLog extends Model
{
    protected $table = 'badge_log';

    protected $fillable = [
        'emp_id',
        'base_id',
        'badge_expiry_date',
        'date_printed',
        'returned_at',
        'returned_by',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'badge_expiry_date' => 'date:Y-m-d',
            'date_printed' => 'datetime',
            'returned_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'emp_id');
    }

    /**
     * @return BelongsTo<Base, $this>
     */
    public function base(): BelongsTo
    {
        return $this->belongsTo(Base::class, 'base_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function returnedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by');
    }
}
