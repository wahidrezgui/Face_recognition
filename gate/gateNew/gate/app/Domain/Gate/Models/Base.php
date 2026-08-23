<?php

namespace App\Domain\Gate\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name_en
 * @property string $name_ar
 */
class Base extends Model
{
    protected $table = 'bases';

    protected $fillable = [
        'name_en',
        'name_ar',
    ];

    public function zones(): HasMany
    {
        return $this->hasMany(Zone::class);
    }

    public function gates(): HasMany
    {
        return $this->hasMany(Gate::class);
    }
}
