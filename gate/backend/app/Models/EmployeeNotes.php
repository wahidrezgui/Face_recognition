<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeNotes extends Model
{
    use HasFactory;
    protected $fillable = [
        'emp_id',
        'mvdate',
        'notes',
        'created_by'
    ];
}
