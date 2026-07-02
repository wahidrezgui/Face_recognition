<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeMovement extends Model
{

    protected $table = 'employee_movements';

 
    public $timestamps = false;

    protected $fillable = [
        'id',
        'department',
        'dep_id',
        'rank',
        'rank_category',
        'military_number',
        'fullname_en',
        'fullname_ar',
        'gender',
        'dep_parent_id',
        'mvdate',
        'mvtime',
        'mvtype',
        'automatic',
        'gate',
        'base',
        'gender_id',
        'rank_id',
        'active',
        'base_id',
        'gate_id',
    ];
}
