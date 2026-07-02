<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeZones extends Model
{
    use HasFactory;

    protected $fillable = [
        'emp_id',
        'base_id',
        'zone_id'
    ];

    public function zone()
    {
        return $this->belongsTo(Zones::class, 'zone_id', 'id');
    }
}
