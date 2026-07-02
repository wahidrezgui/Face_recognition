<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompaniesTimes extends Model
{
    use HasFactory;

    protected $fillable = [
        'dep_id',
        'start_time',
        'end_time',
    ];

}
