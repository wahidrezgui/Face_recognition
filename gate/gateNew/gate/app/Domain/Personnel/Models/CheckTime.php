<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $dep_id
 * @property int $gender_id
 * @property int $rank_id ranks_categories.id, not ranks.id
 * @property string $start_time
 * @property string $end_time
 */
class CheckTime extends Model
{
    protected $table = 'check_times';

    protected $fillable = [
        'dep_id',
        'gender_id',
        'rank_id',
        'start_time',
        'end_time',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'dep_id');
    }

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class, 'gender_id');
    }

    public function rankCategory(): BelongsTo
    {
        return $this->belongsTo(RankCategory::class, 'rank_id');
    }
}
