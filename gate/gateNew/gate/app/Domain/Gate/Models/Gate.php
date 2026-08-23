<?php

namespace App\Domain\Gate\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $base_id
 * @property string $name_en
 * @property string $name_ar
 */
class Gate extends Model
{
    protected $table = 'gates';

    protected $fillable = [
        'base_id',
        'name_en',
        'name_ar',
    ];

    public function base(): BelongsTo
    {
        return $this->belongsTo(Base::class);
    }
}
