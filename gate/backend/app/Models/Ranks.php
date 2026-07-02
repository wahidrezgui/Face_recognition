<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ranks extends Model
{
    use HasFactory;

    protected $fillable = [
        'rank_id',
        'name_en',
        'name_ar',
        'rankvalue',
        'ranks_parents_id',
        'ordre',
        'level'
    ];

    public function rankscateg()
    {
        return $this->belongsTo(RanksCategories::class, 'rank_id');
    }

    // New relation with RanksParents
    public function ranksParent()
    {
        return $this->belongsTo(RanksParents::class, 'ranks_parents_id');
    }

}
