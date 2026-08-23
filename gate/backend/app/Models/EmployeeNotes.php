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
        'created_by_id',
        'created_by_legacy',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Display name from users table via created_by_id only (ignores legacy created_by_legacy).
     */
    public function createdByName(): ?string
    {
        if (!$this->created_by_id || !$this->createdBy) {
            return null;
        }

        return trim("{$this->createdBy->firstname} {$this->createdBy->lastname}") ?: null;
    }
}
