<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CheckTimes extends Model
{
    use HasFactory;

    protected $fillable = [
        'dep_id',
        'gender_id',
        'rank_id',
        'start_time',
        'end_time',
    ];

}
