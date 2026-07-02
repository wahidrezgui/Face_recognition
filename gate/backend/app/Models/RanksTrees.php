<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RanksTrees extends Model
{

    protected $table = 'ranks_trees_view';

 
    public $timestamps = false;

    protected $fillable = [
        'id', 
        'name_en', 
        'name_ar', 
        'parent_id'
    ];
}
