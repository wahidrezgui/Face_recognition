<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RanksParents extends Model
{
    use HasFactory;

    protected $fillable = [
        'name_en',
        'name_ar',
        'ordre',
        'level',
        'ranks_categories_id'
    ];

    // New relation with RanksCategories
    public function rankCategory()
    {
        return $this->belongsTo(RanksCategories::class, 'ranks_categories_id');
    }

    public function ranks() {
        return $this->hasMany(Ranks::class, 'ranks_parents_id');
    }

}
