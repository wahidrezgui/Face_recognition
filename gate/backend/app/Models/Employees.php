<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employees extends Model
{
    use HasFactory;

    protected $fillable = [
        'photo',
        'qrcode',
        'gender_id',
        'fullname_en',
        'fullname_ar',
        'remarks',
        'bloodtype',
        'dep_id',
        'nationality_id',
        'rank_id',
        'military_number',
        'phone_number',
        'qid',
        'dep_parent_id',
        'default_base',
        'created_by',
        'active',
        'expiry_date',
        'Job_Arabic',
        'Job_En',
        'StartTime',
        'EndTime',
        'Escort',
        'device',
        'is_employee'
    ];

    public function Logs()
    {
        return $this->hasMany(Logs::class, 'emp_id', 'id');
    }

    public function movements()
    {
        return $this->hasMany(Movements::class, 'emp_id', 'id');
    }

    public function cars()
    {
        return $this->hasMany(EmployeeCars::class, 'emp_id', 'id');
    }

    public function badgeLogs()
    {
        return $this->hasMany(BadgeLog::class, 'emp_id', 'id');
    }

    public function ranks()
    {
        return $this->belongsTo(Ranks::class, 'rank_id');
    }

    public function department()
    {
        return $this->belongsTo(Departments::class, 'dep_id');
    }

}
