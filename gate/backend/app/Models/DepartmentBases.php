<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentBases extends Model
{
    use HasFactory;

    protected $fillable = [
        'dep_id',
        'base_id',
    ];
}
