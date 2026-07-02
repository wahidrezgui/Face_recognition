<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RanksCategories extends Model
{
    use HasFactory;

    protected $fillable = [
        'name_en',
        'name_ar',
        'ordre',
        'level'
    ];

    public function children()
    {
        return $this->hasMany(Ranks::class, 'rank_id', 'id');
    }

    public function ranksParents() {
        return $this->hasMany(RanksParents::class, 'ranks_categories_id');
    }

}
