<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Movements extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_request_id',
        'emp_id',
        'gate_id',
        'base_id',
        'mvtype',
        'mvtime',
        'mvdate',
        'automatic',
        'platenumber',
        'createdby_id',
        'created_at',
        'updated_at',
    ];


public function employee()
{
    return $this->belongsTo(\App\Models\Employees::class, 'emp_id');
}

public function gate()
{
    return $this->belongsTo(\App\Models\Gates::class, 'gate_id');
}

public function base()
{
    return $this->belongsTo(\App\Models\Bases::class, 'base_id');
}

public function createdBy()
{
    return $this->belongsTo(\App\Models\User::class, 'createdby_id');
}

/**
 * Display name from users table via createdby_id only (ignores legacy created_byname).
 */
public function operatorLabel(): ?string
{
    if (!$this->createdby_id || !$this->createdBy) {
        return null;
    }

    return trim("{$this->createdBy->firstname} {$this->createdBy->lastname}") ?: null;
}
}