<?php

namespace App\Domain\Personnel\Models;

use App\Domain\Gate\Models\Base;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property string|null $name_en
 * @property string $name_ar
 * @property int $parent_id
 * @property int $is_company
 * @property int $is_superadmin
 */
class Department extends Model
{
    protected $table = 'departments';

    protected $fillable = [
        'name_en',
        'name_ar',
        'parent_id',
        'is_company',
    ];

    public function bases(): BelongsToMany
    {
        return $this->belongsToMany(Base::class, 'department_bases', 'dep_id', 'base_id')->withTimestamps();
    }
}
