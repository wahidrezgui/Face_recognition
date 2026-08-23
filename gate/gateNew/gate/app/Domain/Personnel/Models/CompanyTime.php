<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $dep_id
 * @property string $start_time
 * @property string $end_time
 */
class CompanyTime extends Model
{
    protected $table = 'companies_times';

    protected $fillable = [
        'dep_id',
        'start_time',
        'end_time',
    ];
}
