<?php

namespace App\Domain\Gate\Models;

use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $client_request_id
 * @property int $emp_id
 * @property int $base_id
 * @property int $gate_id
 * @property string $mvtype
 * @property string $mvtime
 * @property Carbon $mvdate
 * @property bool $automatic
 * @property string|null $platenumber
 * @property int|null $createdby_id
 * @property string|null $created_byname
 */
class Movement extends Model
{
    protected $table = 'movements';

    protected $fillable = [
        'emp_id', 'base_id', 'gate_id', 'mvtype', 'mvtime', 'mvdate',
        'automatic', 'platenumber', 'createdby_id', 'client_request_id',
    ];

    protected function casts(): array
    {
        return [
            'mvdate' => 'date:Y-m-d',
            'automatic' => 'boolean',
        ];
    }

    public function base(): BelongsTo
    {
        return $this->belongsTo(Base::class);
    }

    public function gate(): BelongsTo
    {
        return $this->belongsTo(Gate::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'emp_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'createdby_id');
    }
}
