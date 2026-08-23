<?php

namespace App\Domain\Gate\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $base_id
 * @property string $name_en
 * @property string|null $name_ar
 * @property string $color
 * @property string $pattern_type
 * @property string|null $pattern_color
 */
class Zone extends Model
{
    protected $table = 'zones';

    protected $fillable = [
        'base_id',
        'name_en',
        'name_ar',
        'color',
        'pattern_type',
        'pattern_color',
    ];

    public function base(): BelongsTo
    {
        return $this->belongsTo(Base::class);
    }
}
