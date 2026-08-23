<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $rank_id
 * @property string $name_en
 * @property string $name_ar
 * @property int $rankvalue
 * @property int $ranks_parents_id
 * @property int $ordre
 * @property int $level
 */
class Rank extends Model
{
    protected $table = 'ranks';

    public function category(): BelongsTo
    {
        return $this->belongsTo(RankCategory::class, 'rank_id');
    }
}
