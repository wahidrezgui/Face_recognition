<?php

namespace App\Domain\Personnel\Models;

use App\Domain\Gate\Models\Base;
use App\Domain\Gate\Models\Movement;
use App\Domain\Gate\Models\Zone;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $status
 * @property string|null $photo
 * @property string $qrcode
 * @property int $gender_id
 * @property int|null $military_number
 * @property int|null $phone_number
 * @property string $fullname_en
 * @property string|null $fullname_ar
 * @property int $dep_id
 * @property int $rank_id
 * @property int $nationality_id
 * @property int $is_employee
 * @property string|null $qid
 * @property int|null $created_by_id
 * @property int $dep_parent_id
 * @property int|null $default_base
 * @property bool $housing
 * @property int|null $active
 * @property Carbon|null $expiry_date
 * @property string|null $remarks
 * @property string|null $bloodtype
 * @property string|null $Job_Arabic
 * @property string|null $Job_En
 * @property string|null $StartTime
 * @property string|null $EndTime
 * @property string|null $Escort
 * @property string|null $device
 * @property Carbon|null $created_at
 */
class Employee extends Model
{
    protected $table = 'employees';

    protected $fillable = [
        'photo', 'qrcode', 'gender_id', 'fullname_en', 'fullname_ar', 'remarks', 'bloodtype',
        'dep_id', 'nationality_id', 'rank_id', 'military_number', 'phone_number', 'qid',
        'dep_parent_id', 'default_base', 'created_by_id', 'active', 'expiry_date',
        'Job_Arabic', 'Job_En', 'StartTime', 'EndTime', 'Escort', 'device', 'is_employee',
        'housing',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date:Y-m-d',
            'housing' => 'boolean',
        ];
    }

    public function cars(): HasMany
    {
        return $this->hasMany(EmployeeCar::class, 'emp_id');
    }

    public function zones(): BelongsToMany
    {
        return $this->belongsToMany(Zone::class, 'employee_zones', 'emp_id', 'zone_id')->withTimestamps();
    }

    public function movements(): HasMany
    {
        return $this->hasMany(Movement::class, 'emp_id');
    }

    public function badgeLogs(): HasMany
    {
        return $this->hasMany(BadgeLog::class, 'emp_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'dep_id');
    }

    public function rank(): BelongsTo
    {
        return $this->belongsTo(Rank::class, 'rank_id');
    }

    public function nationality(): BelongsTo
    {
        return $this->belongsTo(Nationality::class, 'nationality_id');
    }

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class, 'gender_id');
    }

    /**
     * @return BelongsTo<Base, $this>
     */
    public function defaultBase(): BelongsTo
    {
        return $this->belongsTo(Base::class, 'default_base');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
