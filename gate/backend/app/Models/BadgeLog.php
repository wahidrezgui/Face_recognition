<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BadgeLog extends Model
{
    use HasFactory;

    protected $table = 'badge_log';

    protected $fillable = [
        'emp_id',
        'badge_expiry_date',
        'date_printed',
        'created_by',
    ];

    protected $casts = [
        'badge_expiry_date' => 'date',
        'date_printed' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employees::class, 'emp_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
